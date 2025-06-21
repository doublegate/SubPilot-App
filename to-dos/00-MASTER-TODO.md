# 📋 SubPilot Master TODO List

> Central tracking document for all SubPilot development tasks across all phases

## 📊 Overall Progress

- **Phase 0**: ✅ Complete (Project Initialization)
- **Phase 1**: 🚧 In Progress (MVP Buildout)
- **Phase 2**: 📋 Planned (Advanced Features)
- **Phase 3**: 📋 Planned (Automation)
- **Phase 4**: 📋 Planned (Launch)

## 🎯 Current Sprint Focus

**Sprint Goal**: Complete Phase 1 Week 1 - Authentication & Foundation
**Sprint Duration**: July 2-9, 2025
**Key Deliverables**:
1. Auth.js setup with OAuth providers
2. User profile management
3. Protected routes implementation
4. Database schema deployment

## 📁 Phase Documents

1. [Phase 0 - Project Initialization](./phase-0-initialization.md) ✅
2. [Phase 1 - MVP Buildout](./phase-1-mvp.md) 🚧
3. [Phase 2 - Advanced Features](./phase-2-advanced.md) 📋
4. [Phase 3 - Automation](./phase-3-automation.md) 📋
5. [Phase 4 - Launch](./phase-4-launch.md) 📋

## 🚨 High Priority Tasks

### Immediate (This Week)
- [ ] Set up Auth.js with database adapter
- [ ] Create authentication UI components
- [ ] Implement OAuth providers (Google, GitHub)
- [ ] Set up magic link email authentication
- [ ] Create user profile management pages
- [ ] Write authentication tests

### Next Sprint
- [ ] Plaid integration setup
- [ ] Bank account connection flow
- [ ] Transaction synchronization
- [ ] Basic subscription detection

## 🐛 Known Issues & Blockers

### Current Blockers
- None

### Technical Debt
- [ ] Add comprehensive error handling to tRPC routers
- [ ] Set up proper logging system
- [ ] Configure rate limiting middleware
- [ ] Add database connection pooling optimization

## 📈 Metrics & Goals

### Phase 1 Success Metrics
- [ ] User signup/signin flow working
- [ ] Bank accounts successfully connected
- [ ] Subscriptions detected with >80% accuracy
- [ ] Dashboard loads in <2 seconds
- [ ] Test coverage >80%

### Weekly Velocity
- **Target**: 20 story points/week
- **Actual**: TBD

## 🔄 Regular Tasks

### Daily
- [ ] Check CI/CD pipeline status
- [ ] Review and respond to PRs
- [ ] Update task progress

### Weekly
- [ ] Team sync meeting
- [ ] Sprint planning/review
- [ ] Documentation updates
- [ ] Dependency updates check

### Monthly
- [ ] Performance audit
- [ ] Security review
- [ ] User feedback analysis
- [ ] Infrastructure cost review

## 📝 Notes & Decisions

### Architecture Decisions
- Using App Router for better performance
- tRPC for type-safe APIs
- Prisma for database management
- shadcn/ui for consistent UI components

### Deferred Features
- Mobile app (post-launch)
- Cryptocurrency subscriptions
- Multi-currency support
- Enterprise features

## 🔗 Quick Links

- [Project Roadmap](../docs/PROJECT_ROADMAP.md)
- [Architecture Doc](../docs/ARCHITECTURE.md)
- [API Reference](../docs/API_REFERENCE.md)
- [Development Setup](../docs/DEVELOPMENT_SETUP.md)

---

Last Updated: 2025-06-21
Next Review: 2025-06-28