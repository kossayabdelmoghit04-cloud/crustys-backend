import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Button, Section } from '@react-email/components';

export interface ResetPasswordEmailProps {
  firstName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export const ResetPasswordEmail: React.FC<ResetPasswordEmailProps> = ({ 
  firstName, 
  resetUrl,
  expiresInMinutes = 15
}) => {
  return (
    <BaseLayout 
      title="Réinitialisation de votre mot de passe"
      previewTextText="Suivez le lien sécurisé pour réinitialiser le mot de passe de votre compte."
    >
      <Text style={greetingText}>Bonjour {firstName},</Text>
      
      <Text style={paragraphText}>
        Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Crusty's Express. 
        Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton de réinitialisation ci-dessous.
      </Text>
      
      <Section style={ctaSection}>
        <Button href={resetUrl} style={ctaButton}>
          Réinitialiser mon mot de passe
        </Button>
      </Section>
      
      <Text style={warningText}>
        ⚠️ **Remarque de sécurité importante :** Ce lien de réinitialisation sécurisé expirera dans **{expiresInMinutes} minutes** 
        et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer 
        cet e-mail en toute sécurité, votre mot de passe restera inchangé.
      </Text>
      
      <Text style={paragraphText}>
        Si vous rencontrez des difficultés, n'hésitez pas à contacter notre support technique.
      </Text>
      
      <Text style={signatureText}>
        L'équipe de Sécurité Crusty's Express
      </Text>
    </BaseLayout>
  );
};

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
  margin: '0 0 20px 0',
};

const warningText: React.CSSProperties = {
  color: '#f59e0b',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '14px',
  lineHeight: '1.6',
  backgroundColor: '#1e1b1b',
  borderLeft: '4px solid #f59e0b',
  padding: '16px',
  borderRadius: '4px',
  margin: '24px 0',
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
  color: '#e02424',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '15px',
  fontWeight: '600',
  margin: '24px 0 0 0',
};

export default ResetPasswordEmail;
