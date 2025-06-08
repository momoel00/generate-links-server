const axios = require('axios');

axios.post('http://localhost:3000/generate-links', {
  authority_link_target_url: 'https://buyiptvcanada.ca',
  authority_link_description: 'Test backlink',
  authority_link_platforms: ['Google Sites']
}).then(res => {
  console.log('✅ Response:', res.data);
}).catch(err => {
  console.error('❌ Error:', err);
});
