import * as React from 'react';
import { Section, Img, Heading, Link } from '@react-email/components';

export interface EmailHeaderProps {
  title: string;
}

export const EmailHeader: React.FC<EmailHeaderProps> = ({ title }) => {
  return (
    <Section style={headerSection}>
      {/* Brand logo */}
      <div style={logoContainer}>
        <Img
          src="https://cdn.crustysexpress.com/assets/logo-email.png"
          width="180"
          height="45"
          alt="Crusty's Express Logo"
          style={logoImg}
        />
      </div>
      
      {/* Subject banner title */}
      <Heading style={headerHeading}>{title}</Heading>
    </Section>
  );
};

// Inline Styles (Enterprise Grade compatibility across email clients)
const headerSection: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '24px 0',
  backgroundColor: '#0b0d13',
  borderBottom: '3px solid #e02424',
};

const logoContainer: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '16px',
};

const logoImg: React.CSSProperties = {
  margin: '0 auto',
};

const headerHeading: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: "'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};
