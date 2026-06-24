import openpyxl
import json

wb = openpyxl.load_workbook(r'C:\Users\ADMIN\Documents\Srinikc\ExpenseTracker\Gpay_Transactions.xlsm', data_only=True)
ws = wb['Mappings']
mappings = []

person_map = {
    'family': 'Family', 'Family': 'Family', "fam'": 'Family',
    'seenu': 'Seenu', 'Seenu': 'Seenu',
    'father': 'Father', 'mother': 'Mother',
    'vinutha': 'Vinutha', 'Vinutha': 'Vinutha',
    'kishan': 'Kishan', 'smitha': 'Smitha', 'Smitha': 'Smitha',
    'others': 'Others', 'Others': 'Others',
    'friends': 'Friends', 'Friends': 'Friends',
    'smitha/kishan': 'Smitha/Kishan',
    'vinutha/smitha': 'Vinutha/Smitha',
    'smitha/vinutha': 'Smitha/Vinutha',
}

for row in ws.iter_rows(min_row=2, values_only=True):
    key = str(row[0]).strip() if row[0] else ''
    if not key or key == 'None': continue
    desc = str(row[1]).strip() if row[1] and str(row[1]) != 'None' else ''
    exp = str(row[2]).strip() if row[2] and str(row[2]) != 'None' else ''
    sub = str(row[3]).strip() if row[3] and str(row[3]) != 'None' else ''
    per = str(row[4]).strip() if row[4] and str(row[4]) != 'None' else ''
    person = person_map.get(per, per)
    mappings.append({
        'merchantKey': key.lower().strip(),
        'description': desc,
        'expenseType': exp.lower() if exp else '',
        'subCategory': sub.lower() if sub else '',
        'person': person,
        'source': 'mappings_sheet'
    })

seen = {}
for m in mappings:
    k = m['merchantKey']
    if k not in seen: seen[k] = m
deduped = list(seen.values())

with open(r'C:\Users\ADMIN\Documents\Srinikc\AI Products\mymoney\data\mappings.json', 'w', encoding='utf-8') as f:
    json.dump(deduped, f, indent=2, ensure_ascii=False)

print(f'Exported {len(deduped)} merchant mappings')
