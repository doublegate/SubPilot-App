# Contributing to SubPilot

First off, thank you for considering contributing to SubPilot! It's people like you that make SubPilot such a great tool. 🎉

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots (if applicable)
- Your environment details (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Why this enhancement would be useful
- Possible implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards.
4. **Add tests** for any new functionality.
5. **Ensure all tests pass**: `npm run test`
6. **Check your code**: `npm run lint` and `npm run type-check`
7. **Format your code**: `npm run format`
8. **Commit your changes** using conventional commits.
9. **Push to your fork** and submit a pull request.

## Development Setup

See our [Development Setup Guide](docs/DEVELOPMENT_SETUP.md) for detailed instructions.

### Quick Start

```bash
# Clone your fork
git clone https://github.com/your-username/SubPilot-App.git
cd SubPilot-App

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up database
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` types - use proper typing
- Export types separately from implementations
- Use meaningful variable and function names

### React/Next.js

- Prefer server components by default
- Use client components only when necessary
- Follow React best practices and hooks rules
- Keep components small and focused

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in `css_theme/`
- Use shadcn/ui components when available
- Ensure responsive design for all screen sizes

### API Design

- Use tRPC for all API endpoints
- Include proper input validation with Zod
- Handle errors gracefully
- Document complex logic with comments

### Testing

- Write unit tests for utilities and hooks
- Write integration tests for API endpoints
- Write E2E tests for critical user flows
- Aim for good test coverage

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or corrections
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add magic link authentication
fix(dashboard): correct subscription amount calculation
docs(api): update tRPC endpoint documentation
```

## Project Structure

```
src/
├── app/          # Next.js App Router
├── components/   # React components
├── server/       # Backend code
├── lib/          # Utilities
└── types/        # TypeScript types
```

## Database Changes

When modifying the database schema:

1. Update `prisma/schema.prisma`
2. Run `npm run db:generate` to update the client
3. Run `npm run db:push` for development
4. For production changes, create a migration: `npm run db:migrate`

## Environment Variables

Never commit `.env` files. Update `.env.example` when adding new variables.

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Writing Tests

- Place unit tests next to the code they test
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

## Documentation

- Update relevant documentation when making changes
- Add JSDoc comments for complex functions
- Keep README.md up to date
- Document breaking changes clearly

## Getting Help

- Check the [documentation](docs/) first
- Look through existing issues
- Ask questions in discussions
- Join our Discord community

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our contributors page

Thank you for contributing to SubPilot! 🚀