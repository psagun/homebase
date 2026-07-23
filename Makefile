.PHONY: install run test lint clean seed

install:
	cd backend && pip install -r requirements/dev.txt

run:
	cd backend && python -m app.main

test:
	cd backend && python -m pytest tests/ -v --cov=app

lint:
	cd backend && python -m ruff check app/ tests/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	rm -f backend/*.db

seed:
	cd backend && python -c "from app.main import seed_data; seed_data(); print('✅ Database seeded')"
