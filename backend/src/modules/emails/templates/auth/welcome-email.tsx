import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Button, Section } from '@react-email/components';

export interface WelcomeEmailProps {
  firstName: string;
  welcomeUrl?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ 
  firstName, 
  welcomeUrl = 'https://crustysexpress.com/profile' 
}) => {
  return (
    <BaseLayout 
      title="Bienvenue chez Crusty's Express !"
      previewTextText="Votre inscription à notre univers street food premium est confirmée."
    >
      <Text style={greetingText}>Bonjour {firstName},</Text>
      
      <Text style={paragraphText}>
        Nous sommes absolument ravis de vous compter parmi nos clients privilèges ! Chez **Crusty's Express**, 
        nous cuisinons chaque jour des recettes street food premium avec des ingrédients canadiens frais 
        et locaux.
      </Text>
      
      <Text style={paragraphText}>
        Préparez-vous à déguster nos savoureux burgers artisanaux, nos poutines revisitées et bien plus encore, 
        directement en livraison, à emporter, ou sur place en réservant votre table.
      </Text>
      
      <Section style={ctaSection}>
        <Button href={welcomeUrl} style={ctaButton}>
          Découvrir le Menu & Commander
        </Button>
      </Section>
      
      <Text style={paragraphText}>
        À très vite autour d'un bon repas !
      </Text>
      
      <Text style={signatureText}>
        L'équipe Crusty's Express
      </Text>
    </BaseLayout>
  );
};

// Inline CSS for clean visual appearance
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

export default WelcomeEmail;
