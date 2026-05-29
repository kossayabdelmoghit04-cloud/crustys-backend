import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Section } from '@react-email/components';

export interface RefundEmailProps {
  firstName: string;
  refundAmount: number;
  paymentReference: string;
  reason?: string;
}

export const RefundEmail: React.FC<RefundEmailProps> = ({ 
  firstName, 
  refundAmount,
  paymentReference,
  reason = 'Annulation de commande ou geste commercial'
}) => {
  return (
    <BaseLayout 
      title="Notification de remboursement"
      previewTextText={`Un remboursement de ${refundAmount.toFixed(2)} $ CAD a été émis.`}
    >
      <Text style={greetingText}>Bonjour {firstName},</Text>
      
      <Text style={paragraphText}>
        Nous vous informons qu'un remboursement a été initié et traité avec succès en faveur de votre compte 
        pour votre transaction chez **Crusty's Express**.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailText}>💰 **Montant remboursé :** {refundAmount.toFixed(2)} $ CAD</Text>
        <Text style={detailText}>💳 **Référence de transaction :** {paymentReference}</Text>
        <Text style={detailText}>✉️ **Motif :** {reason}</Text>
      </Section>

      <Text style={paragraphText}>
        **Délai de traitement :** Le montant sera crédité sur la carte bancaire utilisée lors de l'achat d'origine. 
        Selon votre établissement bancaire, les fonds apparaîtront sur votre compte sous **5 à 10 jours ouvrés**.
      </Text>

      <Text style={paragraphText}>
        Nous espérons avoir le plaisir de vous régaler à nouveau très bientôt.
      </Text>
      
      <Text style={signatureText}>
        Le Service Client Crusty's Express
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

const detailsBox: React.CSSProperties = {
  backgroundColor: '#1b1f27',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #2d3748',
};

const detailText: React.CSSProperties = {
  color: '#f8fafc',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '6px 0',
};

const signatureText: React.CSSProperties = {
  color: '#e02424',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '15px',
  fontWeight: '600',
  margin: '24px 0 0 0',
};

export default RefundEmail;
