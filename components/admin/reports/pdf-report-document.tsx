import React from 'react';
import { Client, SeoCampaign, SeoKeyword, MetaCampaign, GoogleAdsCampaign, SocialMediaMetrics } from '@/types';
import { 
  pdf, 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet 
} from '@react-pdf/renderer';

// Styles for PDF Report
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  coverPage: {
    padding: 60,
    fontFamily: 'Helvetica',
    backgroundColor: '#0a1628',
    color: '#ffffff',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 100,
  },
  coverSubtitle: {
    fontSize: 16,
    color: '#3b82f6',
    marginTop: 10,
  },
  coverMeta: {
    marginTop: 150,
  },
  coverMetaText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 5,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 20,
    fontSize: 10,
    color: '#64748b',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerRight: {
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 5,
    marginBottom: 10,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  text: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: '#334155',
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 5,
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'center' },
  col4: { width: '20%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  }
});

interface PDFReportProps {
  client: Client;
  monthYear: string;
  seo: SeoCampaign | null;
  seoKeywords: SeoKeyword[];
  meta: MetaCampaign[];
  gads: GoogleAdsCampaign[];
  social: SocialMediaMetrics[];
}

export const PDFReportDocument = ({
  client,
  monthYear,
  seo,
  seoKeywords,
  meta,
  gads,
  social
}: PDFReportProps) => {
  // Aggregate Meta Ads stats
  const metaSpend = meta.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const metaLeads = meta.reduce((acc, c) => acc + Number(c.leads || 0), 0);
  const metaAvgCpl = metaLeads > 0 ? (metaSpend / metaLeads) : 0;

  // Aggregate Google Ads stats
  const gadsSpend = gads.reduce((acc, c) => acc + Number(c.budget_spent || 0), 0);
  const gadsConvs = gads.reduce((acc, c) => acc + Number(c.conversions || 0), 0);
  const gadsCostPerConv = gadsConvs > 0 ? (gadsSpend / gadsConvs) : 0;

  const totalAdSpend = metaSpend + gadsSpend;
  const totalLeadsConversions = metaLeads + gadsConvs;

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4">
        <View style={styles.coverPage}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3b82f6', letterSpacing: 2 }}>VELOXIS GLOBAL</Text>
            <Text style={styles.coverTitle}>PERFORMANCE REPORT</Text>
            <Text style={styles.coverSubtitle}>{client.name}</Text>
          </View>
          <View style={styles.coverMeta}>
            <Text style={styles.coverMetaText}>Reporting Period: {monthYear}</Text>
            <Text style={styles.coverMetaText}>Client Company: {client.company || 'N/A'}</Text>
            <Text style={styles.coverMetaText}>Generated On: {new Date().toLocaleDateString()}</Text>
          </View>
          <View style={styles.coverFooter}>
            <Text>Confidential. © {new Date().getFullYear()} Veloxis Global Digital Marketing Agency. All rights reserved.</Text>
          </View>
        </View>
      </Page>

      {/* Page 2: SEO & Search Metrics */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLeft}>VELOXIS GLOBAL  |  PERFORMANCE REPORT</Text>
          <Text style={styles.headerRight}>{monthYear}</Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.text}>
            This performance review details the growth and acquisition stats across your active digital channels during the month of {monthYear}. Our target optimizations focused on search rankings, social reach, and paid conversion cost improvements.
          </Text>
        </View>

        {/* SEO Section */}
        {seo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Engine Optimization (SEO)</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.metricLabel}>Organic Traffic</Text>
                <Text style={styles.metricValue}>{(seo.organic_traffic ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.metricLabel}>GSC Clicks</Text>
                <Text style={styles.metricValue}>{(seo.gsc_clicks ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.metricLabel}>GSC Impressions</Text>
                <Text style={styles.metricValue}>{(seo.gsc_impressions ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.metricLabel}>Avg Position</Text>
                <Text style={styles.metricValue}>{seo.gsc_avg_position ?? 'N/A'}</Text>
              </View>
            </View>

            {/* Keyword rankings table */}
            {seoKeywords.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#475569', marginBottom: 5 }}>Tracked Keyword Rankings</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.col1}>Keyword</Text>
                    <Text style={styles.col2}>Target Position</Text>
                    <Text style={styles.col3}>Volume</Text>
                    <Text style={styles.col4}>Intent</Text>
                  </View>
                  {seoKeywords.slice(0, 8).map((kw, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.col1}>{kw.keyword}</Text>
                      <Text style={[styles.col2, { color: '#2563eb', fontWeight: 'bold' }]}>{kw.current_position ?? 'N/A'}</Text>
                      <Text style={styles.col3}>{kw.search_volume?.toLocaleString() ?? 'N/A'}</Text>
                      <Text style={[styles.col4, { textTransform: 'capitalize' }]}>{kw.intent || 'General'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Page Footer */}
        <View style={styles.footer}>
          <Text>Veloxis Global Operations Department</Text>
          <Text>Page 2</Text>
        </View>
      </Page>

      {/* Page 3: Paid Ads (PPC) & SMM */}
      {(meta.length > 0 || gads.length > 0 || social.length > 0) && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerLeft}>VELOXIS GLOBAL  |  PERFORMANCE REPORT</Text>
            <Text style={styles.headerRight}>{monthYear}</Text>
          </View>

          {/* Paid Ads Section */}
          {(meta.length > 0 || gads.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paid Advertising (PPC) Overview</Text>
              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.metricLabel}>Total Ad Budget Spent</Text>
                  <Text style={styles.metricValue}>₹{totalAdSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.metricLabel}>Leads / Conversions</Text>
                  <Text style={[styles.metricValue, { color: '#16a34a' }]}>{totalLeadsConversions}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.metricLabel}>Avg Cost Per Lead</Text>
                  <Text style={styles.metricValue}>₹{totalLeadsConversions > 0 ? (totalAdSpend / totalLeadsConversions).toFixed(0) : '0'}</Text>
                </View>
              </View>

              <View style={{ display: 'flex', flexDirection: 'row', gap: 15, marginTop: 10 }}>
                {/* Meta details */}
                {meta.length > 0 && (
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#1e3a8a', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 3, marginBottom: 5 }}>Meta Ads Insights</Text>
                    <Text style={{ fontSize: 8.5, marginBottom: 2 }}>Spend: ₹{metaSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                    <Text style={{ fontSize: 8.5, marginBottom: 2 }}>Leads: {metaLeads}</Text>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>Cost Per Lead (CPL): ₹{metaAvgCpl.toFixed(1)}</Text>
                  </View>
                )}
                {/* Google details */}
                {gads.length > 0 && (
                  <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: '#854d0e', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 3, marginBottom: 5 }}>Google Ads Insights</Text>
                    <Text style={{ fontSize: 8.5, marginBottom: 2 }}>Spend: ₹{gadsSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                    <Text style={{ fontSize: 8.5, marginBottom: 2 }}>Conversions: {gadsConvs}</Text>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>Cost Per Conv (CPC): ₹{gadsCostPerConv.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Social media metrics */}
          {social.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Social Media Organic Performance</Text>
              <View style={styles.grid}>
                {social.map((s, idx) => (
                  <View key={idx} style={[styles.gridItem, { width: '31%' }]}>
                    <Text style={[styles.metricLabel, { color: '#2563eb', fontSize: 9, textTransform: 'capitalize' }]}>{s.platform}</Text>
                    <Text style={{ fontSize: 8, color: '#64748b', marginTop: 4 }}>Followers: {s.followers?.toLocaleString()}</Text>
                    <Text style={{ fontSize: 8, color: '#16a34a', fontWeight: 'bold' }}>New: +{s.new_followers?.toLocaleString()}</Text>
                    <Text style={{ fontSize: 8, color: '#64748b' }}>Reach: {s.reach?.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Page Footer */}
          <View style={styles.footer}>
            <Text>Veloxis Global Operations Department</Text>
            <Text>Page 3</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};
