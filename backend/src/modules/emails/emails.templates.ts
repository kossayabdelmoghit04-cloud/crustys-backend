import React, { ReactElement } from 'react';
import { EMAILS_CONSTANTS } from './emails.constants';
import { TestEmail } from './templates/base/test-email';
import { WelcomeEmail } from './templates/auth/welcome-email';
import { ResetPasswordEmail } from './templates/auth/reset-password-email';
import { OrderConfirmationEmail } from './templates/orders/order-confirmation-email';
import { ReservationConfirmationEmail } from './templates/reservations/reservation-confirmation-email';
import { RefundEmail } from './templates/payments/refund-email';
import { NewOrderAlertEmail } from './templates/admin/new-order-alert';

/**
 * Registry mapping template names to React component factories
 */
export const EmailsTemplatesRegistry: Record<string, (props: any) => ReactElement> = {
  [EMAILS_CONSTANTS.TEMPLATES.TEST_EMAIL]: (props) => React.createElement(TestEmail, props),
  [EMAILS_CONSTANTS.TEMPLATES.WELCOME_EMAIL]: (props) => React.createElement(WelcomeEmail, props),
  [EMAILS_CONSTANTS.TEMPLATES.RESET_PASSWORD]: (props) => React.createElement(ResetPasswordEmail, props),
  [EMAILS_CONSTANTS.TEMPLATES.ORDER_CONFIRMATION]: (props) => React.createElement(OrderConfirmationEmail, props),
  [EMAILS_CONSTANTS.TEMPLATES.RESERVATION_CONFIRMATION]: (props) => React.createElement(ReservationConfirmationEmail, props),
  [EMAILS_CONSTANTS.TEMPLATES.REFUND_NOTIFICATION]: (props) => React.createElement(RefundEmail, props),
  [EMAILS_CONSTANTS.TEMPLATES.ADMIN_NOTIFICATION]: (props) => React.createElement(NewOrderAlertEmail, props),
};

/**
 * Resolves a template name and properties to a React element
 */
export function resolveTemplate(templateName: string, props: any): ReactElement {
  const factory = EmailsTemplatesRegistry[templateName];
  if (!factory) {
    throw new Error(`Email Template '${templateName}' not found in registry.`);
  }
  return factory(props);
}
