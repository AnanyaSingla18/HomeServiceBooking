# Postgres Integration (Sequelize)

This project is originally configured for MongoDB (Mongoose). We added a PostgreSQL option using Sequelize.

How it works

- Add Postgres credentials in `.env` (see `.env.example`).
- Start the app with Postgres enabled by setting:
  - DB_TYPE=postgres
  - and either DATABASE_URL or PG_* environment vars

Seeding Postgres

- A dedicated script `npm run seed:sql` will create tables and insert sample services and an admin user.
- The script uses the `models_sql` Sequelize models and `sequelize.sync()`.

Notes

- Current application routes still use Mongoose models by default. To test Postgres you can run `npm run seed:sql` to seed Postgres separately.
- If you'd like the app to use Postgres for web pages and API, additional migration of routes to prefer `models_sql.compat` wrapper or rewriting controllers to call Sequelize is needed. We provided a small `compat` wrapper for `Service` and `Booking` that matches `find`/`findById`/`create` to make swapping easier. See `routes/services.js` as an example.

Dual DB support
- The app can now connect to both MongoDB and PostgreSQL at the same time if both are configured.
- Use the helper `db/models.js` to access either model set from code: `const { mongo, sql, get } = require('./db/models');` and `get('Service','sql')`.

Next steps (if you want to fully migrate):

- Replace Mongoose model usage with calls to `models_sql.compat` or change to Sequelize native methods (e.g., `findAll, findByPk`).
- Update other routes (`bookings`, `auth`, `admin`) to use SQL models as done in `routes/services.js`.
- Add a migration strategy for advanced migration and data export/import from MongoDB.

If you'd like, I can update the other routes (`auth`, `bookings`, `admin`, `index.js`) to use the SQL compat wrapper as well — tell me if you want a full migration.
