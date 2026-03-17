export interface NotionConfig {
  token: string;
  databaseId: string;
}

export const getNotionConfig = async (): Promise<NotionConfig | null> => {
  const result = await chrome.storage.local.get(['notionToken', 'notionDatabaseId']);
  if (result.notionToken && result.notionDatabaseId) {
    return {
      token: result.notionToken,
      databaseId: result.notionDatabaseId,
    };
  }
  return null;
};

export const saveNotionConfig = async (config: NotionConfig): Promise<void> => {
  await chrome.storage.local.set({
    notionToken: config.token,
    notionDatabaseId: config.databaseId,
  });
};

export const syncToNotion = async (note: any, config: NotionConfig): Promise<boolean> => {
  const { token, databaseId } = config;

  // 1. Prepare children blocks for the page
  const children: any[] = [
    {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `Source: ${note.url}\nAuthor: ${note.author || 'Unknown'}\nCaptured: ${new Date(note.createdAt).toLocaleString()}`,
            },
          },
        ],
      },
    },
    {
      object: 'block',
      type: 'divider',
      divider: {},
    },
  ];

  // Add highlights
  note.highlights.forEach((h: any) => {
    if (h.type === 'image') {
       children.push({
          object: 'block',
          type: 'image',
          image: {
            type: 'external',
            external: {
              url: h.imageUrl
            }
          }
       });
       if (h.text && h.text !== 'Image') {
         children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: h.text,
                  },
                  annotations: {
                     italic: true,
                     color: 'gray'
                  }
                },
              ],
            },
         });
       }
    } else {
      children.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: h.text,
              },
              annotations: {
                color: h.color === 'yellow' ? 'default' : h.color, // Notion colors map slightly differently
              }
            },
          ],
        },
      });
    }
  });

  // 2. Create Page in Database
  // Note: Since we are in a browser extension, calling Notion API directly might run into CORS issues.
  // Ideally, this should go through a proxy server (backend).
  // However, for a purely client-side MVP, we can try using the background script to make the request 
  // (Chrome Extensions background scripts generally bypass CORS) or asking the user to use a CORS proxy.
  // 
  // Let's try direct fetch first. If CORS blocks it, we must move this logic to background.js.
  
  // Actually, 'host_permissions' in manifest v3 allows background service workers to bypass CORS for specified domains.
  // We need to add "https://api.notion.com/*" to host_permissions.

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: note.title,
                },
              },
            ],
          },
          URL: {
            url: note.url,
          },
          Author: {
             rich_text: [
                {
                   text: {
                      content: note.author || ''
                   }
                }
             ]
          },
          Tags: {
             multi_select: [
                { name: 'FlowRead' }
             ]
          }
        },
        children: children,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Notion API Error:', errorData);
      throw new Error(errorData.message || 'Failed to sync to Notion');
    }

    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
};
