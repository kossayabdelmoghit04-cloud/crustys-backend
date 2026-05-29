import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Button, Section } from '@react-email/components';

export interface TestEmailProps {
  name?: string;
  testUrl?: string;
}

export const TestEmail: React.FC<TestEmailProps> = ({ 
  name = 'Invité', 
  testUrl = 'https://crustysexpress.com' 
}) => {
  return (
    <BaseLayout 
      title="Test de l'Infrastructure Email"
      previewTextText="Ceci est un email de validation de Crusty's Express."
    >
      <Text style={greetingText}>Bonjour {name},</Text>
      
      <Text style={paragraphText}>
        Ceci est un e-mail envoyé par le serveur de test de **Crusty's Express**. 
        Si vous lisez ce message, cela signifie que notre infrastructure d'e-mails 
        transactionnels (layout, partials et provider abstraction) est pleinement 
        opérationnelle et prête pour la production.
      </Text>
      
      <Section style={ctaSection}>
        <Button href={testUrl} style={ctaButton}>
          Visiter Crusty's Express
        </Button>
      </Section>
      
      <Text style={signatureText}>
        L'équipe Crusty's Express Dev
      </Text>
    </BaseLayout>
  );
};

// Inline styles for email clients
const greetingText: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const paragraphText: React.CSSProperties = {
  color: '#94a3b8',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
};

const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const ctaButton: React.CSSProperties = {
  backgroundColor: '#e02424',
  borderRadius: '6px',
  color: '#ffffff',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const signatureText: React.CSSProperties = {
  color: '#64748b',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '14px',
  fontStyle: 'italic',
  margin: '24px 0 0 0',
};

export default TestEmail;
