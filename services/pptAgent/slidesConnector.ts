/**
 * Google Slides Connector
 * OAuth 2.0 + Google Slides API integration
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { GoogleSlidesPresentation, SlideContent, ChartData } from './types';

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
];

export class SlidesConnector {
  private oauth2Client: OAuth2Client;
  private slides: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.SLIDES_CLIENT_ID || process.env.GMAIL_CLIENT_ID,
      process.env.SLIDES_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET,
      process.env.SLIDES_REDIRECT_URI || process.env.GMAIL_REDIRECT_URI
    );
    this.slides = google.slides({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
     return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
     });
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticate(code: string): Promise<void> {
     const { tokens } = await this.oauth2Client.getToken(code);
     this.oauth2Client.setCredentials(tokens);
     console.log('[SlidesConnector] Authenticated successfully');
  }

  /**
   * Set tokens directly (for stored credentials)
   */
  setTokens(tokens: { access_token: string; refresh_token?: string }): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a new presentation
   */
  async createPresentation(title: string): Promise<GoogleSlidesPresentation> {
      const response = await this.slides.presentations.create({
        requestBody: { title },
      });
    
      const presentationId = response.data.presentationId!;
      console.log(`[SlidesConnector] Created presentation: ${presentationId}`);

    return {
      presentationId,
      title,
      url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
        slideCount: response.data.slides?.length || 1,
      createdAt: new Date(),
    };
  }

  /**
   * Add slides with content
   */
  async addSlides(
    presentationId: string,
    slideContents: SlideContent[]
  ): Promise<void> {
      const requests = slideContents.map((content, index) => ({
        createSlide: {
          objectId: `slide_${index + 1}`,
          insertionIndex: index + 1,
          slideLayoutReference: {
            predefinedLayout: 'TITLE_AND_BODY',
          },
        },
      }));

      await this.slides.presentations.batchUpdate({
        presentationId,
        requestBody: { requests },
      });
    
      console.log(`[SlidesConnector] Added ${slideContents.length} slides to ${presentationId}`);
  }

  /**
   * Add chart to slide
   */
  async addChart(
    presentationId: string,
    slideId: string,
    chartData: ChartData,
    position: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    // Create a spreadsheet with chart data and build a chart
    const spreadsheetId = await this.createChartSpreadsheet(chartData);

    const requests = [
      {
        createSheetsChart: {
          objectId: `${slideId}_chart`,
          spreadsheetId,
          chartId: 0,
          linkingMode: 'LINKED',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: position.height, unit: 'PT' },
              width: { magnitude: position.width, unit: 'PT' },
            },
            transform: {
              scaleX: position.width / 300,
              scaleY: position.height / 300,
              translateX: position.x,
              translateY: position.y,
              unit: 'PT',
            },
          },
        },
      },
    ];

    await this.slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests },
    });

    console.log(`[SlidesConnector] Added chart to slide ${slideId}`);
  }

  /**
   * Add image to slide
   */
  async addImage(
    presentationId: string,
    slideId: string,
    imageUrl: string,
    position: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const requests = [
      {
        createImage: {
          objectId: `${slideId}_image_${Date.now()}`,
          url: imageUrl,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: position.height, unit: 'PT' },
              width: { magnitude: position.width, unit: 'PT' },
            },
            transform: {
              scaleX: position.width / 300,
              scaleY: position.height / 300,
              translateX: position.x,
              translateY: position.y,
              unit: 'PT',
            },
          },
        },
      },
    ];

    await this.slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests },
    });

    console.log(`[SlidesConnector] Added image to slide ${slideId}`);
  }

  /**
   * Create spreadsheet for chart data
   */
  private async createChartSpreadsheet(chartData: ChartData): Promise<string> {
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client as OAuth2Client });
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `Chart ${Date.now()}` },
        sheets: [{ properties: { title: 'Data' } }],
      },
    });

    const spreadsheetId = createRes.data.spreadsheetId!;

    // Build tabular data from ChartData
    const header = ['Label', ...chartData.datasets.map((ds) => ds.label || 'Series')];
    const rows = chartData.labels.map((label, rowIndex) => [
      label,
      ...chartData.datasets.map((ds) => ds.data[rowIndex] ?? 0),
    ]);
    const values = [header, ...rows];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Data!A1',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    // Add a chart to the sheet (first chart gets id 0)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addChart: {
              chart: {
                spec: {
                  title: `Chart - ${chartData.datasets[0]?.label || 'Series'}`,
                  basicChart: {
                    chartType:
                      chartData.type === 'bar'
                        ? 'BAR'
                        : chartData.type === 'line'
                        ? 'LINE'
                        : chartData.type === 'pie'
                        ? 'PIE'
                        : 'COLUMN',
                    legendPosition: 'BOTTOM_LEGEND',
                    domains: [
                      {
                        domain: {
                          sourceRange: {
                            sources: [
                              {
                                sheetId: 0,
                                startRowIndex: 1,
                                endRowIndex: values.length,
                                startColumnIndex: 0,
                                endColumnIndex: 1,
                              },
                            ],
                          },
                        },
                      },
                    ],
                    series: chartData.datasets.map((_, seriesIndex) => ({
                      series: {
                        sourceRange: {
                          sources: [
                            {
                              sheetId: 0,
                              startRowIndex: 1,
                              endRowIndex: values.length,
                              startColumnIndex: seriesIndex + 1,
                              endColumnIndex: seriesIndex + 2,
                            },
                          ],
                        },
                      },
                    })),
                  },
                },
                position: {
                  newSheet: false,
                  overlayPosition: {
                    anchorCell: { sheetId: 0, rowIndex: 1, columnIndex: 3 },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return spreadsheetId;
  }

  /**
   * Apply theme to presentation
   */
  async applyTheme(
    presentationId: string,
    theme: 'professional' | 'creative' | 'minimal' | 'dark'
  ): Promise<void> {
    const themeColors: Record<string, { background: string; text: string }> = {
      professional: { background: '#FFFFFF', text: '#1A1A1A' },
      creative: { background: '#F0F4F8', text: '#2D3748' },
      minimal: { background: '#FAFAFA', text: '#212121' },
      dark: { background: '#1A202C', text: '#E2E8F0' },
    };

    const colors = themeColors[theme];
    const requests = [
      {
        updatePageProperties: {
          objectId: 'p',
          pageProperties: {
            background: {
              solidFill: {
                color: { rgbColor: this.hexToRgb(colors.background) },
              },
            },
          },
          fields: 'background.solidFill.color',
        },
      },
    ];

    await this.slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests },
    });

    console.log(`[SlidesConnector] Applied theme ${theme} to presentation ${presentationId}`);
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          red: parseInt(result[1], 16) / 255,
          green: parseInt(result[2], 16) / 255,
          blue: parseInt(result[3], 16) / 255,
        }
      : { red: 1, green: 1, blue: 1 };
  }
}

export function createSlidesConnector(): SlidesConnector {
  return new SlidesConnector();
}
