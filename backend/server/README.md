

### Migrations

Migrations are located in the `migrations` directory. To create a new migration, use the Sequelize CLI:

```bash
npx sequelize-mig migration:make -n your-migration-name
```

Preview migrations:

```bash
npx sequelize-mig migration:make --preview
```

To run migrations, use:

```bash
npx sequelize-cli db:migrate
```

To undo the last migration, use:

```bash
npx sequelize-cli db:migrate:undo
```

To undo all migrations, use:

```bash
npx sequelize-cli db:migrate:undo:all
```

To undo to a specific migration, use:

```bash
npx sequelize-cli db:migrate:undo:all --to XXXXXXXXXXXXXXX-your-migration-name.js
```

### Seeders

Seeders are located in the `seeders` directory. To create a new seeder, use the Sequelize CLI:

```bash
npx sequelize-cli seed:generate --name demo-user
```

To run seeders, use:

```bash
npx sequelize-cli db:seed:all
```

To undo the last seeder, use:

```bash
npx sequelize-cli db:seed:undo
```

To undo all seeders, use:

```bash
npx sequelize-cli db:seed:undo:all
```

To undo a specific seeder, use:

```bash
npx sequelize-cli db:seed:undo --seed name-of-seeder-file.js
```

