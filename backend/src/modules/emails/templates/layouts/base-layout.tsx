import * as React from 'react';
import { 
  Html, 
  Head, 
  Preview, 
  Body, 
  Container, 
  Section 
} from '@react-email/components';
import { EmailHeader } from '../partials/email-header';
import { EmailFooter } from '../partials/email-footer';

export interface BaseLayoutProps {
  title: string;
  previewTextText?: string;
  children: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ 
  title, 
  previewTextText = "Crusty's Express - Votre commande street food premium", 
  children 
}) => {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewTextText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <EmailHeader title={title} />
          
          {/* Main Content Area */}
          <Section style={contentSection}>
            {children}
          </Section>
          
          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

// Styling for a modern dark theme restaurant experience
const bodyStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  margin: '0',
  padding: '16px 0',
  width: '100%',
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#11141a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  overflow: 'hidden',
  width: '100%',
};

const contentSection: React.CSSProperties = {
  padding: '40px 32px',
  backgroundColor: '#11141a',
};
