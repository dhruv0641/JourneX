import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers } from 'lucide-react';
import styles from './auth.module.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.frame}>
        <Link href="/" className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to workspace preview
        </Link>
        <div className={styles.folio}>
          <div className={styles.cover}>
            <div className={styles.orbits} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className={styles.identity}>
              <span className={styles.seal}>
                <Layers size={23} aria-hidden="true" />
              </span>
              <div>
                <span className={styles.brand} translate="no">
                  NEXORA
                </span>
                <p className={styles.descriptor}>Personal operating system</p>
              </div>
            </div>
          </div>
          <div className={styles.formPanel}>{children}</div>
        </div>
      </div>
    </main>
  );
}
