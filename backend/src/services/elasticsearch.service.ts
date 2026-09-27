import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';

export const esClient = new Client({
  node: config.elasticsearch.url,
});

const INDEX_NAME = 'emails';

export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      logger.info(`[ELASTICSEARCH] Index '${INDEX_NAME}' created successfully.`);
    }
  } catch (error: any) {
    logger.warn(`[ELASTICSEARCH] Failed to initialize index '${INDEX_NAME}': ${error.message}. Search might be unavailable until ES starts.`);
  }
}

export interface EmailDoc {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}

export async function indexEmail(email: EmailDoc): Promise<void> {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: email.id,
      document: {
        id: email.id,
        userId: email.userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        createdAt: email.createdAt.toISOString(),
      },
    });
    logger.info(`[ELASTICSEARCH] Indexed email ${email.id} with status '${email.status}'`);
  } catch (error: any) {
    logger.error(`[ELASTICSEARCH ERROR] Failed to index email ${email.id}: ${error.message}`);
  }
}

export async function searchEmails(userId: string, query: string) {
  try {
    if (!query || query.trim() === '') {
      return [];
    }

    const response = await esClient.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: [
            { term: { userId: userId } },
            {
              multi_match: {
                query: query,
                fields: ['recipient.keyword^4', 'recipient^3', 'subject^2', 'body'],
                operator: 'AND',
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
    });

    return response.hits.hits.map((hit: any) => hit._source);
  } catch (error: any) {
    logger.error(`[ELASTICSEARCH SEARCH ERROR] Search failed: ${error.message}`);
    return [];
  }
}
