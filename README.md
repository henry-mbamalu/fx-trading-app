## FX Trading App

A high-performance foreign exchange (FX) trading platform built with **NestJS**, designed to handle real-time trading operations efficiently and securely.

### Tech Stack
- **NestJS** – Scalable and modular backend framework.
- **TypeORM** – For managing PostgreSQL database interactions using a clean repository pattern.
- **PostgreSQL** – Robust relational database for storing trades, user data, and market rates.
- **Redis** – Used for:
  - **Caching** exchange rates and frequent queries to enhance speed and reduce DB load.
  - **Distributed locking** to prevent race conditions during concurrent trade executions.
- **Throttler Module** – Ensures rate limiting to prevent abuse and maintain system stability.

### Key Features
- Real-time FX rate fetching and trading.
- Caching for optimized performance and faster response times.
- Distributed locking mechanism to ensure safe concurrent operations.
- Rate limiting to prevent brute-force attacks and excessive API calls.
- Modular architecture for easy testing and scalability.

### Testing & Reliability
- Unit and integration tests to ensure core logic and edge cases are covered.
- Error handling and fallback strategies for better user experience and system resilience.


## Architectural flow diagram
![Architectural flow diagram](https://github.com/henry-mbamalu/fx-trading-app/blob/master/FX-trading-app.jpg?raw=true)

## Postman documentation
https://documenter.getpostman.com/view/30858403/2sB2cVeMyF

## Steps to Get a Gmail App Password (for sending mails)

### Enable 2-Step Verification
https://myaccount.google.com/security

### Generate App Password
https://myaccount.google.com/apppasswords

## Setup postgresql and redis
```bash
# for windows user 
wsl --install

# for windows user (Run this command to start using Linux commands) 
wsl

# Update Your Packages
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo service postgresql start

# Check the status
sudo service postgresql status

# Switch to the PostgreSQL User
sudo -i -u postgres

# Enter PostgreSQL Shell
psql

# Create a New User & Database
CREATE USER fxuser WITH PASSWORD 'fxpassword';

CREATE DATABASE fx_trading_app

GRANT ALL PRIVILEGES ON DATABASE fx_trading_app TO fxuser;

\q


# Then exit the postgres user:
exit

# Allow Password Authentication 
sudo nano /etc/postgresql/12/main/pg_hba.conf

# Look for this line:
local   all             all                                     peer

# Change peer to md5:
local   all             all                                     md5

# Then restart PostgreSQL:
sudo service postgresql restart

# Grant all necessary permissions (needed to run migration)
sudo -u postgres psql

\c fx_trading_app

GRANT ALL PRIVILEGES ON SCHEMA public TO fxuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fxuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fxuser;

\q


# install redis
# (for linux)
sudo apt install redis-server 

# (for mac)
brew install redis 

# verify if it's running
redis-server


```

## Project setup

```bash
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASS=your-16-char-app-password
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=fxuser
DATABASE_PASSWORD=fxpassword
DATABASE_NAME=fx_trading_app
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=adminpassword
RATE_API_URL=https://open.er-api.com

```

```bash
npm install
```
```bash
npm run build
```
```bash
npm run migration:run
```
```bash
npm run seed
```
## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

```

## Run tests

```bash
# unit tests
npm run test
