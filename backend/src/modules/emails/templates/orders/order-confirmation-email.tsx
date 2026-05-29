import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Section, Hr } from '@react-email/components';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderConfirmationEmailProps {
  firstName: string;
  orderNumber: string;
  items: OrderItem[];
  totalPrice: number;
  estimatedDelivery?: string;
}

export const OrderConfirmationEmail: React.FC<OrderConfirmationEmailProps> = ({ 
  firstName, 
  orderNumber,
  items = [],
  totalPrice,
  estimatedDelivery = '30-45 minutes'
}) => {
  return (
    <BaseLayout 
      title="Confirmation de votre commande"
      previewTextText={`Votre commande ${orderNumber} a été enregistrée avec succès.`}
    >
      <Text style={greetingText}>Bonjour {firstName},</Text>
      
      <Text style={paragraphText}>
        Bonne nouvelle ! Votre commande chez **Crusty's Express** a été confirmée par nos cuisines. 
        Notre chef s'affaire déjà aux fourneaux pour vous concocter votre repas street food premium.
      </Text>

      <Section style={orderInfoBox}>
        <Text style={orderInfoText}>**Numéro de commande :** {orderNumber}</Text>
        <Text style={orderInfoText}>**Temps d'attente estimé :** {estimatedDelivery}</Text>
      </Section>

      <Text style={sectionTitle}>Détails de votre commande</Text>
      <Hr style={sectionHr} />
      
      {/* Table of items */}
      <table style={itemsTable}>
        <thead>
          <tr>
            <th style={tableHeaderLeft}>Article</th>
            <th style={tableHeaderRight}>Qté</th>
            <th style={tableHeaderRight}>Prix</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={tableRow}>
              <td style={tableCellLeft}>{item.name}</td>
              <td style={tableCellRight}>x{item.quantity}</td>
              <td style={tableCellRight}>{(item.price * item.quantity).toFixed(2)} $ CAD</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Hr style={sectionHr} />
      
      <div style={totalContainer}>
        <Text style={totalLabel}>Total payé :</Text>
        <Text style={totalValue}>{totalPrice.toFixed(2)} $ CAD</Text>
      </div>

      <Text style={paragraphText}>
        Vous recevrez une notification par SMS ou par email dès que votre commande quittera nos cuisines 
        ou sera prête à être retirée.
      </Text>
      
      <Text style={signatureText}>
        L'équipe de cuisine Crusty's Express
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

const orderInfoBox: React.CSSProperties = {
  backgroundColor: '#1b1f27',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #2d3748',
};

const orderInfoText: React.CSSProperties = {
  color: '#f8fafc',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '14px',
  margin: '4px 0',
};

const sectionTitle: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '16px',
  fontWeight: '700',
  margin: '24px 0 8px 0',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const sectionHr: React.CSSProperties = {
  borderTop: '1px solid #2d3748',
  margin: '12px 0',
};

const itemsTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  color: '#cbd5e1',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '14px',
  marginBottom: '16px',
};

const tableHeaderLeft: React.CSSProperties = {
  textAlign: 'left',
  paddingBottom: '8px',
  color: '#94a3b8',
  fontWeight: '600',
};

const tableHeaderRight: React.CSSProperties = {
  textAlign: 'right',
  paddingBottom: '8px',
  color: '#94a3b8',
  fontWeight: '600',
};

const tableRow: React.CSSProperties = {
  borderBottom: '1px solid #1f2937',
};

const tableCellLeft: React.CSSProperties = {
  padding: '12px 0',
  textAlign: 'left',
  color: '#cbd5e1',
};

const tableCellRight: React.CSSProperties = {
  padding: '12px 0',
  textAlign: 'right',
  color: '#f8fafc',
};

const totalContainer: React.CSSProperties = {
  textAlign: 'right' as const,
  marginBottom: '32px',
};

const totalLabel: React.CSSProperties = {
  display: 'inline-block',
  color: '#94a3b8',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '16px',
  fontWeight: '600',
  marginRight: '12px',
};

const totalValue: React.CSSProperties = {
  display: 'inline-block',
  color: '#e02424',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '20px',
  fontWeight: '700',
};

const signatureText: React.CSSProperties = {
  color: '#e02424',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '15px',
  fontWeight: '600',
  margin: '24px 0 0 0',
};

export default OrderConfirmationEmail;
