# Redis Deployment Guide

MyMoney uses Redis for caching mutual fund data, commodity prices, intelligence insights, and other expensive computations. The application code is 100% platform-agnostic — it reads `REDIS_URL` from the environment. This guide covers installation on all supported platforms.

---

## Table of Contents

1. [Windows (Development)](#windows-development)
2. [Ubuntu / Debian (Production)](#ubuntu--debian-production)
3. [RHEL / CentOS / Rocky Linux (Production)](#rhel--centos--rocky-linux-production)
4. [SLES / openSUSE (Production)](#sles--opensuse-production)
5. [Configuration](#configuration)
6. [Security Hardening](#security-hardening)
7. [Monitoring](#monitoring)
8. [Backup & Restore](#backup--restore)
9. [Troubleshooting](#troubleshooting)

---

## Windows (Development)

MyMoney uses Docker Compose to run Redis on Windows. Docker Desktop must be installed and running.

### Quick Start

```bash
# Start Redis container
npm run redis:up

# Check status
npm run redis:status

# View logs
npm run redis:logs

# Open Redis CLI
npm run redis:cli

# Stop Redis
npm run redis:down
```

### Manual Start

```bash
docker compose up -d
docker compose down
```

### Install Docker Desktop

Download from: https://www.docker.com/products/docker-desktop/

### Configuration

Add to `.env`:
```
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

### Data Persistence

Redis data is persisted in a Docker named volume `redis-data`. Data survives container restarts.

To wipe all data:
```bash
docker compose down -v
```

---

## Ubuntu / Debian (Production)

### Install

```bash
sudo apt update
sudo apt install -y redis-server
```

### Configure

Edit `/etc/redis/redis.conf`:
```
bind 127.0.0.1
port 6379
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
requirepass YOUR_STRONG_PASSWORD
```

Generate a strong password:
```bash
openssl rand -base64 32
```

### Enable & Start

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

### Firewall (if Redis is on a separate host)

```bash
sudo ufw allow from <APP_SERVER_IP> to any port 6379
```

### Configuration in App

Add to `.env` on the app server:
```
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@redis-host:6379
REDIS_ENABLED=true
```

---

## RHEL / CentOS / Rocky Linux (Production)

### Install

```bash
sudo dnf install -y redis
# For older RHEL/CentOS 7: sudo yum install -y redis
```

### Configure

Edit `/etc/redis/redis.conf` (same as Ubuntu):
```
bind 127.0.0.1
port 6379
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
requirepass YOUR_STRONG_PASSWORD
```

### SELinux (if enabled)

```bash
# Allow Redis to bind to port
sudo semanage port -a -t redis_port_t -p tcp 6379

# Or disable SELinux enforcement for Redis (less secure)
sudo setsebool -P nis_enabled 1
```

### Firewall

```bash
sudo firewall-cmd --permanent --add-port=6379/tcp
sudo firewall-cmd --reload
```

### Enable & Start

```bash
sudo systemctl enable redis
sudo systemctl start redis
sudo systemctl status redis
```

**Note:** RHEL uses service name `redis` (not `redis-server` like Ubuntu).

---

## SLES / openSUSE (Production)

### Install

```bash
sudo zypper refresh
sudo zypper install -y redis
```

### Configure

Edit `/etc/redis/redis.conf` (same as Ubuntu/RHEL):
```
bind 127.0.0.1
port 6379
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
requirepass YOUR_STRONG_PASSWORD
```

### Firewall (SuSEfirewall2)

```bash
sudo SuSEfirewall2 open EXT TCP 6379
sudo SuSEfirewall2
```

Or for firewalld (newer SLES):
```bash
sudo firewall-cmd --permanent --add-port=6379/tcp
sudo firewall-cmd --reload
```

### Enable & Start

```bash
sudo systemctl enable redis
sudo systemctl start redis
sudo systemctl status redis
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Full Redis connection string |
| `REDIS_ENABLED` | `true` | Set to `false` to disable Redis entirely (falls back to in-memory cache) |

### Connection String Formats

```
redis://localhost:6379                              # No password
redis://:password@localhost:6379                   # With password
redis://user:password@host:6379/0                  # With user + DB number
rediss://password@host:6380                        # TLS connection
```

### Cache TTL Presets

Defined in `src/lib/cache.ts`:

| Preset | Seconds | Use Case |
|--------|---------|----------|
| `LIVE` | 60 | Real-time data |
| `SHORT` | 300 | Dashboard widgets |
| `MEDIUM` | 900 | Market data |
| `MF_NAV` | 3600 | Mutual fund NAVs |
| `MF_SEARCH` | 86400 | MF search results |
| `NPS` | 86400 | NPS performance |
| `INTELLIGENCE` | 21600 | Intelligence insights |
| `LONG` | 86400 | Reference data |

---

## Security Hardening

### Production Checklist

- [ ] Set a strong `requirepass` (32+ random characters)
- [ ] Bind to `127.0.0.1` unless using a remote Redis
- [ ] Enable `appendonly yes` for data persistence
- [ ] Set `maxmemory` to prevent OOM
- [ ] Use `allkeys-lru` eviction policy
- [ ] Never expose Redis port (6379) to the public internet
- [ ] Use TLS (`rediss://`) for remote Redis
- [ ] Restrict firewall to app server IPs only
- [ ] Regular backups (see below)
- [ ] Monitor memory usage and connection count

### Generate Strong Password

```bash
openssl rand -base64 32
```

---

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3005/api/health/redis
```

Response:
```json
{
  "status": "connected",
  "enabled": true,
  "url": "redis://***@localhost:6379",
  "timestamp": "2026-08-29T12:00:00.000Z"
}
```

### Redis CLI Commands

```bash
# Memory usage
redis-cli info memory

# Connected clients
redis-cli info clients

# Total keys
redis-cli dbsize

# Sample keys
redis-cli --scan --count 10

# Cache hit rate
redis-cli info stats | grep keyspace
```

### Key Metrics to Monitor

- `used_memory` — Should stay below `maxmemory`
- `connected_clients` — Should match app server count
- `keyspace_hits` / `keyspace_misses` — Cache effectiveness
- `evicted_keys` — Should be low (otherwise increase maxmemory)

---

## Backup & Restore

### Automated Backup Script

```bash
#!/bin/bash
# backup-redis.sh
BACKUP_DIR="/var/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Trigger save
redis-cli bgsave

# Wait for save to complete
sleep 5

# Copy dump
cp /var/lib/redis/dump.rdb $BACKUP_DIR/dump_$DATE.rdb
cp /var/lib/redis/appendonly.aof $BACKUP_DIR/appendonly_$DATE.aof 2>/dev/null

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

Schedule via cron:
```bash
0 2 * * * /opt/scripts/backup-redis.sh
```

### Restore

```bash
sudo systemctl stop redis
sudo cp /var/backups/redis/dump_20260829.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo systemctl start redis
```

---

## Troubleshooting

### App says "Redis disconnected"

1. Check if Redis is running:
   ```bash
   sudo systemctl status redis    # Linux
   docker ps | grep redis         # Docker
   ```

2. Check if port is listening:
   ```bash
   ss -tlnp | grep 6379
   ```

3. Test connection:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

4. Check app logs for Redis errors

### High memory usage

1. Check current usage: `redis-cli info memory`
2. Reduce `maxmemory` if app server is small
3. Ensure `maxmemory-policy allkeys-lru` is set
4. Check for keys that aren't being invalidated: `redis-cli --bigkeys`

### Slow performance

1. Check `slowlog`: `redis-cli slowlog get 10`
2. Verify no `KEYS *` commands (use `SCAN` instead)
3. Check network latency if Redis is remote

### Connection refused on Linux

1. Check `bind` directive — must include the interface you're connecting from
2. Check firewall: `sudo ufw status` or `sudo firewall-cmd --list-all`
3. Check SELinux: `getenforce` and audit log

### Data not persisting

1. Verify `appendonly yes` in config
2. Check disk space: `df -h /var/lib/redis`
3. Check file permissions: `ls -la /var/lib/redis/`

---

## Platform Comparison

| Feature | Windows (Docker) | Ubuntu | RHEL | SLES |
|---------|------------------|--------|------|------|
| Install method | docker compose | apt | dnf | zypper |
| Service name | n/a (container) | `redis-server` | `redis` | `redis` |
| Config path | mounted volume | `/etc/redis/redis.conf` | `/etc/redis/redis.conf` | `/etc/redis/redis.conf` |
| Data path | Docker volume | `/var/lib/redis/` | `/var/lib/redis/` | `/var/lib/redis/` |
| Firewall | Windows Defender | ufw / iptables | firewalld | SuSEfirewall2 |
| Init system | Docker | systemd | systemd | systemd |
| Auto-start | restart policy | systemctl enable | systemctl enable | systemctl enable |

---

## Support Scripts

Helper scripts are in `scripts/redis/`:

- `install-ubuntu.sh` — One-command install for Ubuntu
- `install-rhel.sh` — One-command install for RHEL/CentOS
- `install-sles.sh` — One-command install for SLES

Each script installs, configures, enables, and starts Redis with secure defaults.
