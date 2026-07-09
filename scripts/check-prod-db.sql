SELECT count(*) as sessions FROM "Session";
SELECT count(*) as income_sources FROM "IncomeSource";
SELECT id, name as income_categories FROM "Category" WHERE type = 'income';
