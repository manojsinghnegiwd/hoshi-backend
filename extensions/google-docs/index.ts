import { fetchGoogleDoc } from './tools/fetch_google_doc';
import { createGoogleDoc } from './tools/create_google_doc';
import { updateGoogleDoc } from './tools/update_google_doc';
import { deleteGoogleDoc } from './tools/delete_google_doc';
import { listGoogleDocs } from './tools/list_google_docs';

export const googleDocsExtension = {
  name: "google-docs",
  description: "Google Docs",
  type: "extension",
  config: {},
  tools: [
    fetchGoogleDoc,
    createGoogleDoc,
    updateGoogleDoc,
    deleteGoogleDoc,
    listGoogleDocs
  ]
};