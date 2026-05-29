import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Section, Button } from '@react-email/components';

export interface NewOrderAlertEmailProps {
  orderNumber: string;
  totalPrice: number;
  deliveryType: string;
  customerName: string;
  adminDashboardUrl?: string;
}

export const NewOrderAlertEmail: React.FC<NewOrderAlertEmailProps> = ({ 
  orderNumber, 
  totalPrice,
  deliveryType,
  customerName,
  adminDashboardUrl = 'https://admin.crustysexpress.com/orders'
}) => {
  return (
    <BaseLayout 
      title="Alerte : Nouvelle commande !"
      previewTextText={`Une nouvelle commande ${orderNumber} de ${totalPrice.toFixed(2)} $ CAD vient d'être passée.`}
    >
      <Text style={greetingText}>Bonjour Administrateur,</Text>
      
      <Text style={paragraphText}>
        Une nouvelle commande vient d'être enregistrée sur la plateforme **Crusty's Express**. 
        Veuillez vous assurer que nos équipes en cuisine ou le service de livraison la prennent en charge 
        rapidement.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailText}>📦 **Numéro de commande :** {orderNumber}</Text>
        <Text style={detailText}>👥 **Client :** {customerName}</Text>
        <Text style={detailText}>💰 **Montant brut :** {totalPrice.toFixed(2)} $ CAD</Text>
        <Text style={detailText}>🛵 **Mode de remise :** {deliveryType}</Text>
      </Section>

      <Section style={ctaSection}>
        <Button href={adminDashboardUrl} style={ctaButton}>
          Gérer la commande en cuisine
        </Button>
      </Section>

      <Text style={signatureText}>
        Système de Notification Crusty's Express
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
  backgroundColor: '#1e1b1b',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #e02424',
};

const detailText: React.CSSProperties = {
  color: '#cbd5e1',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '6px 0',
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

export default NewOrderAlertEmail;
