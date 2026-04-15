# Contributing to PeopleDesk

Thank you for contributing to PeopleDesk! This guide will help you get started with our development standards.

## 🛠 Development Setup

1.  **Fork & Clone**: Standard git workflow.
2.  **Environment Setup**: Ensure you have Node.js v20+ and PostgreSQL v15+ installed.
3.  **Local Dev**: 
    - Use `npm run dev` in both directories for hot-reloading.
    - Check for console logs in the browser for frontend issues.
    - Check terminal output in `server/` for backend logs.

## 📜 Coding Standards

- **ESLint**: Run `npm run lint` before committing. We follow strict React and Node.js best practices.
- **Naming Conventions**:
    - **Frontend Components**: PascalCase (e.g., `AdminDashboard.jsx`).
    - **Variables/Functions**: camelCase.
    - **Database Models**: PascalCase (handled by Prisma).
- **Styling**: Always use Tailwind utility classes. Avoid writing custom CSS in `index.css` unless absolutely necessary (e.g., keyframes).

## 🗃 Database Changes

If you need to modify the schema:
1.  Edit `server/prisma/schema.prisma`.
2.  Run `npx prisma migrate dev --name <description>`.
3.  Update the seed script in `server/prisma/seed.js` if the change affects initial data.

## 💬 Pull Request Process

1.  Create a feature branch from `main`.
2.  Ensure all lints pass.
3.  Provide a clear description of the change and any UI screenshots if applicable.
4.  Wait for review from the lead developer.

## 🚀 Deployment

We use PM2 for managing the production processes on the VPS. 
- To deploy: SSH into the server and run `./deploy.sh` from the root directory.
- For emergency restarts: `pm2 restart all`.

---
Happy coding!
