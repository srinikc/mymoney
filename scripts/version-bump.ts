// ── Version Bump Script ──────────────────────────────────────────────────
// Industry standard semver 2.0.0 versioning.
//
// Usage:
//   tsx scripts/version-bump.ts patch    # 1.0.0 → 1.0.1 (bug fixes)
//   tsx scripts/version-bump.ts minor    # 1.0.0 → 1.1.0 (new features)
//   tsx scripts/version-bump.ts major    # 1.0.0 → 2.0.0 (breaking changes)
//   tsx scripts/version-bump.ts prerelease alpha   # 1.0.0 → 1.0.1-alpha
//   tsx scripts/version-bump.ts current   # show current version (no change)
//
// After bumping, the script:
//   1. Updates package.json
//   2. Prompts to commit the change
//   3. Optionally creates a git tag (you'll be asked to confirm)
//
// The build number (commit count) is separate and auto-generated —
// you do NOT need to manage it manually.

import { readFileSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { join } from "node:path"
import * as readline from "node:readline"

const PACKAGE_JSON = join(process.cwd(), "package.json")
const RELEASES_MD = join(process.cwd(), "RELEASES.md")

type BumpType = "major" | "minor" | "patch" | "prerelease" | "current"

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim()
  } catch (e) {
    throw new Error(`Command failed: ${cmd}\n${(e as Error).message}`)
  }
}

function parseSemVer(v: string): { major: number; minor: number; patch: number; prerelease: string } {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/)
  if (!match) throw new Error(`Invalid semver: ${v}. Expected MAJOR.MINOR.PATCH[-prerelease]`)
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
  }
}

function bumpVersion(current: string, type: BumpType, prereleaseTag?: string): string {
  const sv = parseSemVer(current)
  let { major, minor, patch, prerelease } = sv

  switch (type) {
    case "major":
      major += 1
      minor = 0
      patch = 0
      prerelease = ""
      break
    case "minor":
      minor += 1
      patch = 0
      prerelease = ""
      break
    case "patch":
      patch += 1
      prerelease = ""
      break
    case "prerelease":
      // Add or increment prerelease
      if (prerelease) {
        // e.g. "alpha.1" → "alpha.2", "alpha.2" → "alpha.3"
        const m = prerelease.match(/^(.+?)\.(\d+)$/)
        if (m) {
          prerelease = `${m[1]}.${Number(m[2]) + 1}`
        } else {
          // e.g. "alpha" → "alpha.1"
          prerelease = `${prerelease}.1`
        }
      } else {
        // e.g. "1.0.0" → "1.0.0-alpha.1"
        prerelease = prereleaseTag ? `${prereleaseTag}.1` : "alpha.1"
      }
      break
    case "current":
      return current
  }

  const base = `${major}.${minor}.${patch}`
  return prerelease ? `${base}-${prerelease}` : base
}

async function prompt(question: string, defaultYes = true): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    const suffix = defaultYes ? " [Y/n] " : " [y/N] "
    rl.question(question + suffix, (answer) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()
      if (trimmed === "") resolve(defaultYes)
      else resolve(trimmed === "y" || trimmed === "yes")
    })
  })
}

async function main() {
  const arg = process.argv[2] as BumpType | undefined
  const prereleaseTag = process.argv[3]

  if (!arg) {
    console.log(`Usage: tsx scripts/version-bump.ts <bump-type> [prerelease-tag]

Bump types (semver 2.0.0):
  major         # Breaking changes (X.0.0)
  minor         # New features, backward-compatible (0.X.0)
  patch         # Bug fixes, small improvements (0.0.X)
  prerelease    # Pre-release (requires [prerelease-tag] like alpha/beta/rc)
  current       # Show current version

Examples:
  tsx scripts/version-bump.ts patch
  tsx scripts/version-bump.ts minor
  tsx scripts/version-bump.ts major
  tsx scripts/version-bump.ts prerelease alpha
  tsx scripts/version-bump.ts prerelease beta
  tsx scripts/version-bump.ts prerelease rc

Build numbers are auto-generated from git commit count — do not manage manually.`)
    process.exit(1)
  }

  if (!["major", "minor", "patch", "prerelease", "current"].includes(arg)) {
    console.error(`Invalid bump type: ${arg}`)
    process.exit(1)
  }

  // Read current version
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8"))
  const current: string = pkg.version
  console.log(`Current version: ${current}`)
  console.log(`Bump type:       ${arg}${prereleaseTag ? ` (prerelease tag: ${prereleaseTag})` : ""}`)

  if (arg === "current") {
    process.exit(0)
  }

  const newVersion = bumpVersion(current, arg, prereleaseTag)
  console.log(`New version:     ${newVersion}`)

  const proceed = await prompt(`\nUpdate package.json from ${current} → ${newVersion}?`)
  if (!proceed) {
    console.log("Cancelled.")
    process.exit(0)
  }

  // Update package.json
  pkg.version = newVersion
  writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n", "utf8")
  console.log(`✓ Updated ${PACKAGE_JSON}`)

  // Read current git branch
  const branch = exec("git rev-parse --abbrev-ref HEAD")
  const commitCount = exec("git rev-list --count HEAD")
  const currentBuild = parseInt(commitCount, 10) || 0
  const isPrerelease = newVersion.includes("-")

  console.log(`\nOn branch:   ${branch}`)
  console.log(`Build:       ${currentBuild}`)
  console.log(`Next build:  ${currentBuild + 1} (after commit)`)
  if (isPrerelease) {
    console.log(`Type:        Prerelease (no git tag)`)
  } else {
    console.log(`Tag:         v${newVersion}`)
  }

  // Auto-update RELEASES.md template
  const today = new Date().toISOString().slice(0, 10)
  const releaseEntry = `\n### v${newVersion} — ${isPrerelease ? "Pre-release" : "Release"}\n\n- **Date:** ${today}\n- **Build:** ${currentBuild + 1}\n- **Highlights:** _TODO: add release notes_\n\n**Added:**\n- _TODO_\n\n**Changed:**\n- _TODO_\n\n**Fixed:**\n- _TODO_\n\n---\n`

  // Open RELEASES.md and insert at the right place
  let releases = readFileSync(RELEASES_MD, "utf8")
  // Insert new entry right after "## Released versions"
  releases = releases.replace(
    /(## Released versions\n\n)/,
    `$1${releaseEntry}`,
  )
  writeFileSync(RELEASES_MD, releases, "utf8")
  console.log(`✓ Added stub entry to ${RELEASES_MD} (edit to add details)`)

  // Suggest next steps
  console.log(`\nNext steps:`)
  console.log(`  1. Edit ${RELEASES_MD} to fill in the highlights and changelog`)
  console.log(`  2. git add package.json RELEASES.md`)
  console.log(`  3. git commit -m "release: v${newVersion}"`)
  if (!isPrerelease) {
    console.log(`  4. git tag v${newVersion}`)
    console.log(`  5. git push origin ${branch} --follow-tags`)
  } else {
    console.log(`  4. (No tag for prerelease)`)
    console.log(`  5. git push origin ${branch}`)
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
