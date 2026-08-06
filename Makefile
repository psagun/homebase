.PHONY: install run test lint seed clean

install:
	pip install -r requirements.txt

run:
	python -m uvicorn backend.main:app --port 8001 --reload

test:
	python -m pytest tests/ -q

lint:
	python -m ruff check backend/ tests/

seed:
	python -c "from backend.database import Base, engine; import backend.models; Base.metadata.create_all(bind=engine); from backend.routers.seed import seed_database; print(seed_database(key='dev-cron-secret'))"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	rm -f homebase.db homebase-dev.db
