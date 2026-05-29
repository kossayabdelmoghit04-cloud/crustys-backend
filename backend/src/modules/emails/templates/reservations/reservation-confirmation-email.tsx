import * as React from 'react';
import { BaseLayout } from '../layouts/base-layout';
import { Text, Section, Link } from '@react-email/components';

export interface ReservationConfirmationEmailProps {
  firstName: string;
  date: string; // ISO 8601 Format
  guests: number;
  specialRequests?: string | null;
}

export const ReservationConfirmationEmail: React.FC<ReservationConfirmationEmailProps> = ({ 
  firstName, 
  date,
  guests,
  specialRequests = null
}) => {
  // Format the date for human reading
  const formattedDate = new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Montreal',
  });

  return (
    <BaseLayout 
      title="Confirmation de votre réservation"
      previewTextText="Votre table a été réservée avec succès chez Crusty's Express."
    >
      <Text style={greetingText}>Bonjour {firstName},</Text>
      
      <Text style={paragraphText}>
        Nous sommes ravis de vous confirmer que votre table a été réservée chez **Crusty's Express**. 
        Toute notre équipe se réjouit à l'idée de vous accueillir et de vous faire vivre une 
        expérience street food inoubliable.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailText}>🗓️ **Date et Heure :** {formattedDate} (Heure de Montréal)</Text>
        <Text style={detailText}>👥 **Nombre d'invités :** {guests} personne(s)</Text>
        {specialRequests && (
          <Text style={detailText}>✉️ **Demande spéciale :** *"{specialRequests}"*</Text>
        )}
      </Section>

      <Section style={locationBox}>
        <Text style={locationTitle}>📍 Comment nous trouver</Text>
        <Text style={locationText}>
          **Crusty's Express**<br />
          123 Rue de la Montagne, Montréal, QC, H3G 1Z8, Canada<br />
          <Link href="https://maps.google.com/?q=123+Rue+de+la+Montagne+Montreal" style={mapLink}>
            Voir l'itinéraire sur Google Maps
          </Link>
        </Text>
      </Section>

      <Text style={warningText}>
        *Note : En cas de retard ou d'empêchement, merci de nous notifier ou d'annuler votre réservation au moins 1 heure à l'avance depuis votre espace client.*
      </Text>

      <Text style={signatureText}>
        L'équipe d'accueil Crusty's Express
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

const locationBox: React.CSSProperties = {
  backgroundColor: '#0b0d13',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
  borderLeft: '4px solid #e02424',
};

const locationTitle: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '15px',
  fontWeight: '700',
  margin: '0 0 8px 0',
};

const locationText: React.CSSProperties = {
  color: '#cbd5e1',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
};

const mapLink: React.CSSProperties = {
  color: '#ef4444',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: '600',
  display: 'inline-block',
  marginTop: '8px',
};

const warningText: React.CSSProperties = {
  color: '#64748b',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
  fontSize: '12px',
  lineHeight: '1.4',
  fontStyle: 'italic',
  margin: '24px 0',
};

const signatureText: React.CSSProperties = {
  color: '#e02424',
  fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
  fontSize: '15px',
  fontWeight: '600',
  margin: '24px 0 0 0',
};

export default ReservationConfirmationEmail;
