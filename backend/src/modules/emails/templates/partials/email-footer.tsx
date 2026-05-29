import * as React from 'react';
import { Section, Text, Link, Hr } from '@react-email/components';

export const EmailFooter: React.FC = () => {
  return (
    <Section style={footerSection}>
      <Hr style={footerHr} />
      
      {/* Dynamic helpful links */}
      <Text style={footerLinks}>
        <Link href="https://crustysexpress.com/profile" style={footerLink}>Mon Compte</Link>
        {' • '}
        <Link href="https://crustysexpress.com/support" style={footerLink}>Support & Contact</Link>
        {' • '}
        <Link href="https://crustysexpress.com/terms" style={footerLink}>CGV & Mentions</Link>
      </Text>

      {/* Corporate details */}
      <Text style={footerAddress}>
        © {new Date().getFullYear()} Crusty's Express. Tous droits réservés.<br />
        123 Rue de la Montagne, Montréal, QC, H3G 1Z8, Canada
      </Text>
      
      <Text style={footerDisclaimer}>
        Vous recevez cet email car vous avez effectué un achat ou réservé une table chez Crusty's Express.
      </Text>
    </Section>
  );
};

// Inline Styles for email client rendering compatibility
const footerSection: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '32px 0',
  backgroundColor: '#0b0d13',
};

const footerHr: React.CSSProperties = {
  borderTop: '1px solid #1f2937',
  marginBottom: '24px',
};

const footerLinks: React.CSSProperties = {
  color: '#94a3b8',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '13px',
  margin: '0 0 16px 0',
};

const footerLink: React.CSSProperties = {
  color: '#ef4444',
  textDecoration: 'none',
};

const footerAddress: React.CSSProperties = {
  color: '#64748b',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '0 0 12px 0',
};

const footerDisclaimer: React.CSSProperties = {
  color: '#475569',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '11px',
  lineHeight: '1.4',
  margin: '0',
};
