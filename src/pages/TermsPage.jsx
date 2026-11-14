import { Link } from 'react-router-dom';
import usePageMeta from '../components/PageMeta.jsx';

const SECTIONS = [
  {
    title: '1. What Just Idea is',
    body: 'Just Idea is a place where founders publish an idea, other people rate it from one to five stars and leave written advice, and businesses can send a contact or support request to the founder. Ideas are readable without an account; posting, rating, advice and business requests need a signed-in account.',
  },
  {
    title: '2. Accounts and security',
    body: 'You need an account to take part. Passwords are stored only as salted scrypt hashes, sessions live in HttpOnly cookies that expire after seven days, and every state-changing request is checked against a CSRF token. Login and sign-up are rate limited. Never share your password, and sign out on shared devices.',
  },
  {
    title: '3. Posting ideas',
    body: 'You keep ownership of the ideas you post. Post only ideas you are allowed to share, and do not post confidential material you do not own. By posting, you give Just Idea permission to display the idea, its ratings and its advice on this site. Posts go through a human check to keep automated spam out.',
  },
  {
    title: '4. Ratings, advice and business requests',
    body: 'Rate in good faith and keep advice specific and civil. Ratings are attributed to the name on the account. Harassment, spam, scraping, automated voting, and attempts to manipulate averages are not allowed and can end with the account being closed.',
  },
  {
    title: '5. Startup help and admin details',
    body: 'Each idea has a startup-help switch owned by the founder who posted it. While the switch is closed, no admin details are shown. When the founder opens it, helpers who have already sent a contact or support request on that idea can see the founder name, contact email and the notes the founder chose to share. Founders should only share contact details they are comfortable giving to helpers.',
  },
  {
    title: '6. LinkedIn connection and milestone publishing',
    body: 'You can connect a LinkedIn account to Just Idea. Connecting stores an access token encrypted at rest, used only to publish an idea you own once it reaches the 10,000,000-rating milestone, when you press the publish button. Just Idea never posts without that action, and you can disconnect by contacting the maintainers.',
  },
  {
    title: '7. Demo account and open source',
    body: 'The demo account is deliberately public so anyone can explore the site, including the startup-help flow and the founder controls. Anything you write while signed in to the demo account is visible to everyone else using it. Do not enter personal or confidential information there.',
  },
  {
    title: '8. Data we store',
    body: 'We store your email, display name, a password hash, session records, the ideas you post, and the ratings, advice and business requests you send. Founder contact details are shown only through the startup-help flow described above. There is no advertising tracking on this site.',
  },
  {
    title: '9. Your controls',
    body: 'You can edit or close startup help for ideas you posted at any time. You can stop using the service and ask for the account to be removed; the ideas, ratings and advice tied to it are handled with that request.',
  },
  {
    title: '10. Limits of the service',
    body: 'Just Idea is offered as-is, without warranties. Advice and ratings are opinions of other users, not professional or financial advice. The service may change, and these terms may be updated; continuing to use it means you accept the current version.',
  },
];

export default function TermsPage() {
  usePageMeta({
    title: 'Terms of service',
    description:
      'The rules for using Just Idea: accounts and security, posting ideas, startup help, the LinkedIn milestone, the demo account and the data we store.',
    path: '/terms',
  });

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Terms</p>
        <h1>Terms of service &amp; privacy</h1>
        <p className="hero__lead">
          Short version: be a real person, rate honestly, and only share contact details you are
          happy for helpers to see.
        </p>
      </header>

      <div className="panel stack legal">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>

      <p className="small">
        Questions about these terms? <Link to="/login">Sign in</Link> and use the startup-help
        contact on any idea, or read the project README for the maintainers.
      </p>
    </>
  );
}
