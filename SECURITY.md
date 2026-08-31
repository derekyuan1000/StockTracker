# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **derekyuan1000@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce it
- The potential impact (what an attacker could do)
- Any suggested fix, if you have one

I'll acknowledge the report within 48 hours and aim to release a fix within 7 days for critical issues.

## Scope

Things that are in scope:

- Authentication bypass or session hijacking
- SQL injection or data exposure via the API
- Privilege escalation (accessing another user's portfolio data)
- Secrets or credentials accidentally committed to the repo

Things that are out of scope:

- Rate limiting or brute-force on public endpoints
- Self-XSS (attacks that require the victim to run code themselves)
- Issues that require physical access to a device

## Disclosure

Once a fix is released, I'm happy to credit you in the changelog if you'd like.
