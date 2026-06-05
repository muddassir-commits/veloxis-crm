// lib/emails/report-notification.tsx
import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ReportNotificationEmailProps {
  clientName: string;
  monthYear: string;
  portalUrl: string;
}

export const ReportNotificationEmail = ({
  clientName,
  monthYear,
  portalUrl,
}: ReportNotificationEmailProps) => {
  const previewText = `Your performance report for ${monthYear} is now ready.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>VELOXIS GLOBAL</Text>
            <Text style={headerSub}>OPERATIONS DEPT</Text>
          </Section>
          <Section style={content}>
            <Heading style={heading}>Performance Report Ready</Heading>
            <Text style={paragraph}>Dear {clientName},</Text>
            <Text style={paragraph}>
              We are pleased to inform you that your digital marketing performance report for{' '}
              <strong>{monthYear}</strong> is now compiled and ready for your review.
            </Text>
            <Text style={paragraph}>
              This report contains detailed metrics on your SEO keyword rankings, PPC search ad conversions, social media reach, and overall growth stats from the past month.
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={button} href={portalUrl}>
                Access Client Portal
              </Button>
            </Section>

            <Text style={paragraph}>
              If you have any questions or would like to schedule our monthly strategy review call, please don&apos;t hesitate to reach out.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              Veloxis Global CRM Client Relations Department. This email is intended for {clientName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #e6ebf1',
  borderRadius: '8px',
  maxWidth: '580px',
};

const header = {
  padding: '32px 48px 24px',
  backgroundColor: '#0a1628',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
};

const logoText = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#ffffff',
  letterSpacing: '1.5px',
  margin: '0',
};

const headerSub = {
  fontSize: '10px',
  color: '#3b82f6',
  fontWeight: 'bold',
  letterSpacing: '2px',
  margin: '4px 0 0 0',
};

const content = {
  padding: '40px 48px 0',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0a1628',
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#4b5563',
  margin: '0 0 16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#2e66ff',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0 24px',
};

const footer = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#9ca3af',
  margin: '0',
};
