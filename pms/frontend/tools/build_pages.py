#!/usr/bin/env python3
"""Writes the public pages (features, pricing, about, contact, faq, login, signup).

Every page shares the same header and footer, so they are kept here in one place
instead of being copy-pasted eight times. Run this after editing:

    python3 build_pages.py

The output is plain static HTML - no build tool is needed to run the site.
"""

import os

OUT = os.path.join(os.path.dirname(__file__), "..")

NAV = [("index.html", "Home"), ("features.html", "Features"), ("pricing.html", "Pricing"),
       ("about.html", "About"), ("faq.html", "FAQ"), ("contact.html", "Contact")]


def shell(file, title, desc, body, scripts="", active=None):
    links = "\n      ".join(
        '<a href="%s"%s>%s</a>' % (href, ' aria-current="page"' if href == (active or file) else "", label)
        for href, label in NAV)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="stylesheet" href="css/site.css">
</head>
<body>

<header class="nav-bar" id="navBar">
  <div class="wrap nav-inner">
    <a class="brand" href="index.html"><span class="mark"></span><span>Baribari</span></a>
    <nav class="nav-links">
      {links}
    </nav>
    <div class="nav-cta">
      <a class="btn ghost" href="login.html">Sign in</a>
      <a class="btn" href="signup.html">Get started</a>
    </div>
    <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false"><span></span></button>
  </div>
</header>

<main>
{body}
</main>

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brand light" href="index.html"><span class="mark"></span><span>Baribari</span></a>
        <p style="margin-top:.8rem;max-width:32ch">Property management for building owners in Bangladesh.
           A DBMS course project built with PHP, MySQL and plain JavaScript.</p>
      </div>
      <div>
        <h4>Product</h4>
        <a href="features.html">Features</a>
        <a href="pricing.html">Pricing</a>
        <a href="login.html">Sign in</a>
        <a href="signup.html">Create account</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="about.html">About the team</a>
        <a href="contact.html">Contact</a>
        <a href="faq.html">FAQ</a>
      </div>
      <div>
        <h4>Support</h4>
        <a href="contact.html">Help centre</a>
        <a href="faq.html">Common questions</a>
        <a href="tel:+8801700000000">01700-000000</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>&copy; 2026 Baribari. Student project, not a commercial product.</span>
      <span>Chattogram, Bangladesh</span>
    </div>
  </div>
</footer>

<script src="js/site.js"></script>
{scripts}
</body>
</html>
"""


def head_block(eyebrow, title, lead):
    return f"""  <section class="page-head">
    <div class="wrap">
      <span class="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p class="lead">{lead}</p>
    </div>
  </section>
"""


# ============================================================ FEATURES
features = head_block(
    "Features", "Everything a building needs, in one account",
    "Baribari covers the whole cycle: the building itself, the people renting it, the money coming in "
    "and the money going out.") + """
  <section>
    <div class="wrap">
      <div class="grid three">
        <article class="card"><div class="ico">🏢</div><h3>Building and floor plan</h3>
          <p>Every building holds floors, every floor holds flats, shops, offices or garages. The floor plan view
             colours each unit green, amber or red so you can see the building at a glance.</p></article>
        <article class="card"><div class="ico">⚡</div><h3>Bulk setup</h3>
          <p>Ten floors with three flats each is one form and one click. Then edit any single flat that has a
             different rent, size or number of bedrooms.</p></article>
        <article class="card"><div class="ico">🔑</div><h3>Tenant records</h3>
          <p>Name, phone, NID, occupation, family size, permanent address and an emergency contact - everything
             you would otherwise keep on a photocopy in a drawer.</p></article>
        <article class="card"><div class="ico">📄</div><h3>Agreements</h3>
          <p>Start date, duration, monthly rent, advance taken and the rent due day. Agreements ending within
             sixty days are flagged so you can start looking for a tenant early.</p></article>
        <article class="card"><div class="ico">৳</div><h3>Rent collection</h3>
          <p>One button creates the rent line for every active agreement. Record full, partial or missed payments
             with the method - cash, bKash, Nagad, bank or cheque.</p></article>
        <article class="card"><div class="ico">🧾</div><h3>Bills by category</h3>
          <p>Electricity, water, gas, garbage, lift, wiring, plumbing, painting, security. Each bill can belong to
             the whole building or to one flat.</p></article>
        <article class="card"><div class="ico">🔧</div><h3>Maintenance jobs</h3>
          <p>Log what broke, how urgent it is and who is fixing it. Marking a job done with a cost writes the
             expense for you, so no repair is ever missed in the accounts.</p></article>
        <article class="card"><div class="ico">👷</div><h3>Staff and salary</h3>
          <p>Caretakers, guards and cleaners attached to a building, with a monthly salary sheet you can generate
             and tick off as you pay.</p></article>
        <article class="card"><div class="ico">📊</div><h3>Reports</h3>
          <p>Per building, per month: rent collected, rent unpaid, bills, salaries and net profit - plus a
             six-month chart of income against spending.</p></article>
      </div>
    </div>
  </section>

  <section class="band-soft">
    <div class="wrap split">
      <div>
        <span class="eyebrow">Three roles</span>
        <h2>Everyone sees exactly what they should.</h2>
        <p>The system separates the person who owns the buildings, the person who runs them day to day and the
           person who runs the platform.</p>
        <ul class="ticks">
          <li><strong>Owner</strong> - adds buildings, hires managers, sees every report</li>
          <li><strong>Manager</strong> - collects rent, records bills, calls the plumber, pays the staff</li>
          <li><strong>Admin</strong> - looks after subscribers, plans and the platform itself</li>
          <li>One owner's data can never be seen by another owner - every query is scoped by account</li>
        </ul>
      </div>
      <div class="split-media">
        <img src="images/city-brand.svg" alt="Illustration of buildings in the brand colour" loading="lazy">
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="section-head center">
        <span class="eyebrow">Under the hood</span>
        <h2>Built the way the course asked for it.</h2>
      </div>
      <div class="grid three">
        <article class="card"><h3>16 related tables</h3>
          <p>Owners, managers, properties, floors, units, tenants, leases, rent payments, expenses, categories,
             staff, salaries, maintenance, plans, subscriptions and admin.</p></article>
        <article class="card"><h3>Normalised to 3NF</h3>
          <p>No repeating groups, no partial dependency, no transitive dependency. Categories and plans live in
             their own tables rather than as repeated text.</p></article>
        <article class="card"><h3>Safe by default</h3>
          <p>Bcrypt password hashing, prepared statements for every query, session checks on every endpoint and
             escaped output in the browser.</p></article>
      </div>
      <p class="center" style="margin-top:2rem"><a class="btn big" href="signup.html">Create an account</a></p>
    </div>
  </section>
"""

# ============================================================ PRICING
pricing = head_block(
    "Pricing", "Simple plans, priced in taka",
    "Pick a plan when you sign up. You can see and change the plans from the admin dashboard at any time.") + """
  <section>
    <div class="wrap">
      <div class="plans" id="planList">
        <div class="plan"><h3>Basic</h3><div class="price">&#2547;500 <small>/ 30 days</small></div>
          <ul><li>Up to 2 buildings</li><li>1 manager login</li><li>Tenants, rent and bills</li>
              <li>Monthly report</li></ul>
          <a class="btn ghost wide" href="signup.html">Choose Basic</a></div>
        <div class="plan featured"><h3>Standard</h3><div class="price">&#2547;1,500 <small>/ 30 days</small></div>
          <ul><li>Up to 10 buildings</li><li>Unlimited manager logins</li><li>Staff and salary sheet</li>
              <li>Maintenance tracking</li><li>Six-month income chart</li></ul>
          <a class="btn wide" href="signup.html">Choose Standard</a></div>
        <div class="plan"><h3>Premium</h3><div class="price">&#2547;4,000 <small>/ 90 days</small></div>
          <ul><li>Up to 50 buildings</li><li>Everything in Standard</li><li>Priority support</li>
              <li>Best value per month</li></ul>
          <a class="btn ghost wide" href="signup.html">Choose Premium</a></div>
      </div>
      <p class="center muted" style="margin-top:1rem" id="planNote">Prices load from the database when the
         server is running.</p>
    </div>
  </section>

  <section class="band-soft">
    <div class="wrap">
      <div class="section-head center"><h2>What is included</h2></div>
      <div class="table-wrap">
        <table class="table-simple">
          <thead><tr><th>Feature</th><th>Basic</th><th>Standard</th><th>Premium</th></tr></thead>
          <tbody>
            <tr><td>Buildings</td><td>2</td><td>10</td><td>50</td></tr>
            <tr><td>Flats per building</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
            <tr><td>Manager logins</td><td>1</td><td>Unlimited</td><td>Unlimited</td></tr>
            <tr><td>Tenants and agreements</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Rent collection</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Bills and maintenance</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Staff salary sheet</td><td>&#8212;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Monthly profit report</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
            <tr><td>Priority support</td><td>&#8212;</td><td>&#8212;</td><td>&#10003;</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap faq">
      <div class="section-head center"><h2>Questions about billing</h2></div>
      <details><summary>How do I pay?</summary>
        <p>In this student version the subscription is recorded with a transaction id when you sign up. A real
           bKash or Nagad gateway would slot into the same table without any schema change.</p></details>
      <details><summary>What happens when my plan runs out?</summary>
        <p>The subscription is marked expired. Your data stays exactly where it is - you simply renew to keep
           adding buildings.</p></details>
      <details><summary>Can I change plan later?</summary>
        <p>Yes. Each purchase is a new row in the subscription table, so your whole payment history is kept.</p></details>
      <details><summary>What if I have more buildings than my plan allows?</summary>
        <p>The system stops you from adding one more and tells you which plan to move to. Nothing is deleted.</p></details>
    </div>
  </section>
"""

# ============================================================ ABOUT
about = head_block(
    "About", "A course project with a real problem behind it",
    "Baribari started from a simple observation: most landlords in our city still run several buildings out of "
    "one notebook and a calculator.") + """
  <section>
    <div class="wrap split">
      <div>
        <h2>The problem we picked</h2>
        <p>Ask any building owner in Chattogram what his flats earned him last month and the answer takes ten
           minutes of flipping pages. Rent is written in one book, the electricity bill is a stack of receipts,
           the caretaker's salary is remembered rather than recorded, and the plumber's bill is a number someone
           said on the phone.</p>
        <p>None of that is hard data to keep. It is just spread out. So we modelled it properly - sixteen tables,
           clear relationships, no duplicated facts - and put a simple screen in front of it.</p>
        <p>This is our Database Management Systems course project. The database design came first: the ER diagram,
           the cardinalities and the normalisation. The website exists to prove the design works.</p>
      </div>
      <div class="split-media">
        <img src="images/city-day.svg" alt="Illustration of apartment buildings" loading="lazy">
      </div>
    </div>
  </section>

  <section class="band-soft">
    <div class="wrap">
      <div class="section-head center">
        <span class="eyebrow">The team</span>
        <h2>Who built what</h2>
        <p class="lead">Replace these names and roles with your own group members before you submit.</p>
      </div>
      <div class="team">
        <article class="card"><div class="avatar">A</div><h3>Member One</h3>
          <p class="role">Database design</p>
          <p>ER diagram, normalisation, schema and the seed data.</p></article>
        <article class="card"><div class="avatar b2">B</div><h3>Member Two</h3>
          <p class="role">Backend</p>
          <p>PHP API, sessions, authentication and query design.</p></article>
        <article class="card"><div class="avatar b3">C</div><h3>Member Three</h3>
          <p class="role">Frontend - dashboard</p>
          <p>Owner and manager dashboards, tables, forms and charts.</p></article>
        <article class="card"><div class="avatar b4">D</div><h3>Member Four</h3>
          <p class="role">Frontend - website</p>
          <p>Home page, features, pricing, about, FAQ and contact pages.</p></article>
        <article class="card"><div class="avatar">E</div><h3>Member Five</h3>
          <p class="role">Testing and documentation</p>
          <p>Test cases, README, report writing and the presentation.</p></article>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="section-head center"><span class="eyebrow">Tools</span><h2>What it is built with</h2></div>
      <div class="grid three">
        <article class="card"><h3>MySQL</h3><p>Sixteen tables with foreign keys, cascade deletes and unique
          constraints that enforce the weak-entity identities.</p></article>
        <article class="card"><h3>PHP with PDO</h3><p>A small JSON API. Prepared statements everywhere,
          bcrypt for passwords, sessions for login state.</p></article>
        <article class="card"><h3>HTML, CSS, JavaScript</h3><p>No framework and no build step. Every page is a
          file you can open and read.</p></article>
      </div>
    </div>
  </section>

  <section class="band-soft">
    <div class="wrap">
      <div class="section-head center"><span class="eyebrow">Timeline</span><h2>How the term went</h2></div>
      <div class="steps">
        <div class="step"><h3>Weeks 1-3</h3><p>Requirement gathering, talking to two building owners, listing the
          entities and drawing the first ER diagram.</p></div>
        <div class="step"><h3>Weeks 4-8</h3><p>Normalising to 3NF, writing the schema, building the API and the
          dashboards, loading demo data.</p></div>
        <div class="step"><h3>Weeks 9-12</h3><p>Public website, responsive testing on phones and tablets,
          bug fixing, documentation and the final report.</p></div>
      </div>
    </div>
  </section>
"""

# ============================================================ FAQ
faq = head_block(
    "FAQ", "Questions people ask us",
    "If your question is not here, the contact page reaches us directly.") + """
  <section>
    <div class="wrap faq">
      <h2 style="margin-bottom:1.2rem">Using the system</h2>
      <details open><summary>Do I need to be good with computers?</summary>
        <p>No. If you can use a phone you can use this. Every screen is a list with an Add button, and nothing is
           deleted without asking you first.</p></details>
      <details><summary>Can my manager use it instead of me?</summary>
        <p>Yes. Create a manager from your dashboard and give him the email and password. He sees the same
           buildings but cannot delete them or hire other managers.</p></details>
      <details><summary>What if one flat has a different rent from the others?</summary>
        <p>Build the floors in bulk, then open any flat and change its rent, size or number of bedrooms.</p></details>
      <details><summary>A tenant paid only half the rent. Can I record that?</summary>
        <p>Yes. Enter the amount you actually received and the line is marked partial, with the remainder showing
           in the month's dues.</p></details>
      <details><summary>A tenant is leaving. What do I do?</summary>
        <p>End the agreement from the Leases page. The flat immediately becomes vacant and is ready for the next
           tenant, while the old agreement stays in the history.</p></details>
      <details><summary>Does the repair cost go into my accounts?</summary>
        <p>When you mark a maintenance job as done and type the cost, an expense is created for that building
           automatically, so the profit figure is always honest.</p></details>

      <h2 style="margin:2.5rem 0 1.2rem">Account and data</h2>
      <details><summary>Can another landlord see my buildings?</summary>
        <p>No. Every request checks who is logged in and filters by account, so one owner's data is invisible to
           every other owner.</p></details>
      <details><summary>Are my passwords safe?</summary>
        <p>Passwords are stored as bcrypt hashes. Even with a copy of the database, nobody can read them.</p></details>
      <details><summary>What happens if the admin deletes my account?</summary>
        <p>Everything that belongs to it goes with it - buildings, tenants, agreements, bills and managers. The
           database does this with cascade deletes, so nothing is left orphaned.</p></details>

      <h2 style="margin:2.5rem 0 1.2rem">For the examiner</h2>
      <details><summary>Where is the ER diagram?</summary>
        <p>In the <code>docs</code> folder. Open <code>er-diagram.html</code> in a browser for the Chen notation
           diagram with relationship diamonds, and a second page with every entity's attributes.</p></details>
      <details><summary>Is the schema normalised?</summary>
        <p>Yes, to third normal form. The reasoning, including the one deliberate exception, is written out in
           <code>docs/ER-DIAGRAM.md</code>.</p></details>
      <details><summary>How do I run it?</summary>
        <p>Copy the folder into XAMPP's <code>htdocs</code>, import <code>database/schema.sql</code> through
           phpMyAdmin and open <code>http://localhost/pms/frontend/</code>.</p></details>
    </div>
  </section>
"""

# ============================================================ CONTACT
contact = head_block(
    "Contact", "Talk to us",
    "Questions about the project, the database design or a demo for your own buildings.") + """
  <section>
    <div class="wrap split">
      <div>
        <div class="form-card">
          <h2 style="font-size:1.35rem">Send a message</h2>
          <p class="muted" style="font-size:.92rem">We usually reply within a day.</p>
          <div class="msg" id="contactMsg"></div>
          <div class="row-2">
            <div class="field"><label for="c_name">Your name</label><input id="c_name" placeholder="Rahim Uddin"></div>
            <div class="field"><label for="c_phone">Phone</label><input id="c_phone" placeholder="01XXXXXXXXX"></div>
          </div>
          <div class="field"><label for="c_email">Email</label><input id="c_email" type="email" placeholder="you@mail.com"></div>
          <div class="field"><label for="c_subject">What is it about</label>
            <select id="c_subject">
              <option>A demo for my buildings</option>
              <option>Pricing and plans</option>
              <option>Something is not working</option>
              <option>Question about the project</option>
            </select></div>
          <div class="field"><label for="c_message">Message</label>
            <textarea id="c_message" placeholder="Tell us how many buildings you have and what you need."></textarea></div>
          <button class="btn wide big" id="contactSend">Send message</button>
          <p class="help muted">This form is front-end only in the student version - nothing is emailed.</p>
        </div>
      </div>

      <div>
        <div class="card" style="margin-bottom:1rem">
          <div class="ico">📍</div><h3>Where we are</h3>
          <p>Department of Computer Science<br>Chattogram, Bangladesh</p>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <div class="ico">📞</div><h3>Phone</h3>
          <p><a href="tel:+8801700000000">01700-000000</a><br>Sunday to Thursday, 10am - 6pm</p>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <div class="ico">✉️</div><h3>Email</h3>
          <p><a href="mailto:hello@baribari.test">hello@baribari.test</a></p>
        </div>
        <img src="images/city-brand.svg" alt="Illustration of buildings" style="border-radius:16px" loading="lazy">
      </div>
    </div>
  </section>
"""

# ============================================================ LOGIN
login = """  <section>
    <div class="wrap auth-page">
      <div>
        <span class="eyebrow">Welcome back</span>
        <h1 style="font-size:clamp(1.9rem,5vw,2.6rem)">Sign in to your account</h1>
        <p class="lead">Choose who you are signing in as. Owners and managers land on the property dashboard,
           the admin gets the platform dashboard.</p>

        <div class="form-card" style="margin-top:1.5rem">
          <div class="tabs" role="tablist">
            <button role="tab" data-role="owner" aria-selected="true">Property owner</button>
            <button role="tab" data-role="manager" aria-selected="false">Manager</button>
            <button role="tab" data-role="admin" aria-selected="false">Admin</button>
          </div>

          <div class="msg" id="msg"></div>

          <div class="field"><label for="email">Email</label>
            <input id="email" type="email" autocomplete="username" placeholder="owner@pms.com"></div>
          <div class="field"><label for="password">Password</label>
            <input id="password" type="password" autocomplete="current-password" placeholder="Your password"></div>

          <button class="btn wide big" id="loginBtn">Sign in</button>
          <p class="center muted" style="margin:1rem 0 0;font-size:.92rem" id="signupSwitch">
            New here? <a href="signup.html">Create an owner account</a></p>

          <div class="demo-box">
            <strong style="color:#101a14">Demo logins</strong>
            <table>
              <tr><td>Owner</td><td>owner@pms.com / 123456</td></tr>
              <tr><td>Manager</td><td>manager@pms.com / 123456</td></tr>
              <tr><td>Admin</td><td>admin@pms.com / admin123</td></tr>
            </table>
          </div>
        </div>
      </div>

      <div class="auth-aside">
        <img src="images/city-evening.svg" alt="Illustration of apartment buildings in the evening">
        <div class="card" style="margin-top:1rem">
          <h3>Trouble signing in?</h3>
          <p class="muted" style="font-size:.93rem">Make sure Apache and MySQL are running in XAMPP and that
             <code>database/schema.sql</code> has been imported. Then check you picked the right tab above.</p>
        </div>
      </div>
    </div>
  </section>
"""

# ============================================================ SIGNUP
signup = """  <section>
    <div class="wrap auth-page">
      <div>
        <span class="eyebrow">Get started</span>
        <h1 style="font-size:clamp(1.9rem,5vw,2.6rem)">Create your owner account</h1>
        <p class="lead">One account holds all of your buildings. You can add a manager later, or run everything
           yourself.</p>

        <div class="form-card" style="margin-top:1.5rem">
          <div class="msg" id="msg"></div>

          <div class="field"><label for="s_name">Full name</label>
            <input id="s_name" placeholder="Rahim Uddin"></div>
          <div class="row-2">
            <div class="field"><label for="s_email">Email</label>
              <input id="s_email" type="email" placeholder="you@mail.com"></div>
            <div class="field"><label for="s_phone">Phone</label>
              <input id="s_phone" placeholder="01XXXXXXXXX"></div>
          </div>
          <div class="row-2">
            <div class="field"><label for="s_pass">Password</label>
              <input id="s_pass" type="password" placeholder="At least 6 characters"></div>
            <div class="field"><label for="s_nid">NID number</label>
              <input id="s_nid" placeholder="Optional"></div>
          </div>
          <div class="field"><label for="s_address">Address</label>
            <input id="s_address" placeholder="Agrabad, Chattogram"></div>
          <div class="row-2">
            <div class="field"><label for="s_plan">Subscription plan</label>
              <select id="s_plan"><option value="1">Loading plans...</option></select></div>
            <div class="field"><label for="s_self">Who manages the buildings?</label>
              <select id="s_self">
                <option value="1">I manage them myself</option>
                <option value="0">I will hire a manager</option>
              </select></div>
          </div>

          <button class="btn wide big" id="signupBtn">Create account</button>
          <p class="center muted" style="margin:1rem 0 0;font-size:.92rem">
            Already have an account? <a href="login.html">Sign in</a></p>
        </div>
      </div>

      <div class="auth-aside">
        <img src="images/city-brand.svg" alt="Illustration of buildings">
        <div class="card" style="margin-top:1rem">
          <h3>What you get straight away</h3>
          <ul class="ticks" style="margin-top:.6rem">
            <li>Floor plan view of every building</li>
            <li>One-click monthly rent list</li>
            <li>Bills, repairs and salary tracking</li>
            <li>A profit figure for each building</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
"""

PAGES = [
    ("features.html", "Features — Baribari", "Floor plans, tenants, agreements, rent collection, bills, "
     "maintenance, staff salary and monthly profit reports.", features, ""),
    ("pricing.html", "Pricing — Baribari", "Basic, Standard and Premium plans priced in taka.", pricing,
     '<script src="js/api.js"></script>\n<script src="js/pricing.js"></script>'),
    ("about.html", "About — Baribari", "The team behind the project and the tools we used.", about, ""),
    ("faq.html", "FAQ — Baribari", "Common questions about using Baribari.", faq, ""),
    ("contact.html", "Contact — Baribari", "Get in touch about a demo or the project.", contact,
     '<script src="js/contact.js"></script>'),
    ("login.html", "Sign in — Baribari", "Sign in as a property owner, manager or admin.", login,
     '<script src="js/api.js"></script>\n<script src="js/auth.js"></script>'),
    ("signup.html", "Create an account — Baribari", "Create a property owner account.", signup,
     '<script src="js/api.js"></script>\n<script src="js/auth.js"></script>'),
]

for name, title, desc, body, scripts in PAGES:
    html = shell(name, title, desc, body, scripts)
    open(os.path.join(OUT, name), "w").write(html)
    print("wrote", name)
