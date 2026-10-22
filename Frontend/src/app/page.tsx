import Link from "next/link";
import styles from "./page.module.css";
export default function Home() {
  return <main className={styles.page}>
    <span className={styles.badge}>Hackathon Starter</span>
    <h1>Your next idea starts here.</h1>
    <p>Create an account, sign in, and start building your hackathon project.</p>
    <nav className={styles.actions} aria-label="Account navigation">
      <Link className={styles.primary} href="/signup">Create account</Link>
      <Link href="/login">Sign in</Link>
      <Link href="/account">My account</Link>
    </nav>
  </main>;
}
