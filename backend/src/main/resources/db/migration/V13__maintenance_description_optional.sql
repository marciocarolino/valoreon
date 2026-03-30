-- description already exists from V8; allow NULL for optional text
ALTER TABLE maintenances
	ALTER COLUMN description DROP NOT NULL;
