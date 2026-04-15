# 🏠 Home Service Booking System

A full-stack web application that allows users to book home services such as cleaning, plumbing, and electrical work.  
The system supports dynamic UI rendering using EJS and integrates a **dual database architecture (MongoDB + PostgreSQL)** for flexibility and scalability.

---

## 🚀 Features

### 👤 User Features
- User Registration & Login (JWT Authentication)
- Browse available services
- Book services
- View booking history

### 🛠️ Admin Features
- Add / Update / Delete services
- Manage bookings
- Role-based access control

### ⚙️ System Features
- Server-side rendering using **EJS**
- RESTful APIs with Express.js
- Dual database support:
  - MongoDB (Mongoose)
  - PostgreSQL (Sequelize)
- Switchable DB using environment config
- Secure authentication with JWT

---

## 🧱 Tech Stack

| Layer        | Technology |
|-------------|------------|
| Frontend    | EJS, HTML, CSS |
| Backend     | Node.js, Express.js |
| Database    | MongoDB + PostgreSQL |
| ORM/ODM     | Mongoose, Sequelize |
| Auth        | JWT |

---

## 📁 Project Structure
home-service/
│── models/ # MongoDB models
│── models_sql/ # PostgreSQL models (Sequelize)
│── routes/ # API routes
│── controllers/ # Business logic
│── views/ # EJS templates
│── middleware/ # Auth & error handling
│── config/ # DB configuration
│── server.js # Entry point
│── package.json


---

##🔄 Database Switching

This project supports dual database mode:

DB_TYPE=mongo → Uses MongoDB (Mongoose)
DB_TYPE=postgres → Uses PostgreSQL (Sequelize)
