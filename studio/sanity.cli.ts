import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineCliConfig({
	api: {
		projectId: projectId ?? '',
		dataset
	},
	deployment: {
		// TODO: run `pnpm studio sanity deploy` to claim a fresh appId for Thong Biltong
		appId: ''
	}
});
