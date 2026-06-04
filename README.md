# Live Medica Sample Website

## Overview

Live Medica Sample Website is a simple healthcare-themed web application built using Node.js and Express. The application provides user registration and login functionality with data persistence using a JSON-based storage system.

The project demonstrates full-stack web development concepts including routing, form handling, user authentication, and server-side data management.

---

## Features

* User Registration
* User Login
* Express.js Backend
* JSON-based User Data Storage
* Static HTML Pages
* CSS Styling
* Environment Variable Configuration
* Simple and Lightweight Architecture

---

## Project Structure

```text
live-medica-sample-website/
│
├── css/
│   └── auth.css
|   └── style.css
│
├── js/
│   └── main.js
│
├── data/
│   └── users.json
│
├── index.html
├── login.html
├── register.html
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
├── .env
│
└── README.md
```

---

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Data Storage

* JSON File Storage (`users.json`)

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Meganath835/live-medica-sample-website.git
cd live-medica-sample-website
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
```

Add any additional environment variables required by your application.

---

## Running the Application

Start the server:

```bash
node server.js
```

or

```bash
npm start
```

The application will be available at:

```text
http://localhost:3000
```

---

## Application Pages

### Home Page

* Landing page of the application.
* Accessible through `index.html`.

### Registration Page

* Allows new users to create an account.
* User details are stored in `data/users.json`.

### Login Page

* Allows registered users to authenticate and access the application.

---

## Data Storage

User information is stored locally in:

```text
data/users.json
```

This project uses JSON-based storage for learning and demonstration purposes.

For production applications, consider using databases such as:

* MongoDB
* PostgreSQL
* MySQL

---

## Security Notes

* Do not commit `.env` files to GitHub.
* Store sensitive credentials in environment variables.
* Hash passwords before storing them in production environments.
* Validate user input on both client and server sides.

---

## Future Improvements

* Password hashing using bcrypt
* Session management
* JWT Authentication
* Database Integration
* Appointment Booking System
* Medical Records Management
* Responsive UI Enhancements
* Role-based Access Control

---

## Author

**Meganath Saravanan**

GitHub: https://github.com/Meganath835

---

## License

This project is intended for educational and demonstration purposes.
