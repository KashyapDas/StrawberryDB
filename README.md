# 🍓 StrawberryDB

**A TypeScript-based Hybrid ORM/ODM for PostgreSQL and MongoDB.**

StrawberryDB is a database abstraction library designed to simplify database interactions by providing a unified developer-facing API for both relational and document-oriented databases.

Instead of maintaining separate database interaction patterns for SQL and NoSQL databases, StrawberryDB aims to bring them together under one consistent interface.

## 🚀 Features

- **Hybrid ORM/ODM Architecture:** Work with PostgreSQL and MongoDB through a unified API.
- **Automatic Database Detection:** Automatically identifies the database type using the connection URL.
- **Schema Management:** Define and manage database schemas using a consistent TypeScript-based structure.
- **Automatic Primary Key Generation:** Handles primary key generation according to the underlying database.
- **Relationship Management:** Provides an abstraction for defining relationships between schemas.
- **Data Validation:** Supports schema-level validation and field constraints.
- **CRUD Operations:** Provides methods for creating, finding, and updating records.
- **Query Parsing:** Supports SQL-like conditions and logical/comparison operators.
- **Schema Synchronization:** Provides schema synchronization capabilities.
- **SchemaConnectors:** A separate module for schema migration between supported databases.

## 🛠️ Tech Stack

- TypeScript
- Node.js
- PostgreSQL
- MongoDB
- `pg`
- Mongoose

## 📦 Installation

Install StrawberryDB using npm:

```bash
npm install strawberrydb
```

## ⚙️ Getting Started

### 1. Import StrawberryDB

```typescript
import { strawberry } from "strawberrydb";
```

### 2. Connect to a Database

Provide your database connection URL.

```typescript
await strawberry.connectSandBox(
  "postgresql://username:password@localhost:5432/mydb"
);
```

For MongoDB:

```typescript
await strawberry.connectSandBox(
  "mongodb://localhost:27017/mydb"
);
```

StrawberryDB detects the database type from the connection URL.

### 3. Define a Schema

Example:

```typescript
await strawberry.users.createSchema({
  username: {
    type: "string",
    required: true,
    unique: true
  },
  age: {
    type: "int",
    required: true
  },
  email: {
    type: "string",
    required: true
  }
}, true);
```

### 4. Insert Records

```typescript
await strawberry.users.insertRecord({
  username: "kashyap",
  age: 22,
  email: "kashyap@example.com"
});
```

### 5. Update Records

StrawberryDB supports SQL-like condition strings for record updates.

```typescript
await strawberry.users.updateRecord(
  "WHERE age > 18 AND status = 'active'",
  {
    status: "verified"
  },
  false
);
```

## 🧩 Supported Data Types

| Data Type | Description |
|---|---|
| `string` | String values |
| `int` | Integer values |
| `float` | Floating-point values |
| `boolean` | Boolean values |
| `date` | Date and timestamp values |
| `array` | Array values |
| `object` | Nested object values |

## 🔧 Schema Options

StrawberryDB supports configurable schema field options:

- `required`
- `default`
- `unique`
- `min`
- `max`
- `minLength`
- `maxLength`
- `uppercase`
- `lowercase`

## 🏗️ Architecture

StrawberryDB follows a layered architecture:

```text
       Developer Application
                |
                v
         StrawberryProxy
                |
                v
          StrawberryCore
                |
                v
          connectSandBox()
                |
         +------+------+
         |             |
         v             v
      PostgreSQL    MongoDB
         |             |
         v             v
        pg           Mongoose
```

The proxy layer provides the developer-facing API, while the core layer handles database-specific operations.

## 🎯 Project Goal

The primary goal of StrawberryDB is to reduce the complexity of working with multiple database paradigms.

Developers should be able to interact with different database technologies without having to completely change their application-level database interaction patterns.

## 🔮 Future Scope

- Improved query optimization.
- Advanced relationship management.
- Expanded database support.
- Enhanced schema migration capabilities.
- Performance monitoring and logging.
- More comprehensive validation and testing.

## 👨‍💻 Author

**Kashyap Jyoti Das**

Software Engineer | Full Stack Developer

## 📄 License

This project is licensed under the MIT License.

---

**StrawberryDB — One API, Multiple Database Paradigms.** 🍓
