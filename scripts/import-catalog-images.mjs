#!/usr/bin/env node
import { gql, sleep } from './lib/shopify-admin.mjs';

const products = {
  'gid://shopify/Product/8109861109835': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsYNgtvPt8XSEKc84hLsDn5bY67dQ6N6gPpVL-lRZtCS06KfnL-_UiEsHcVqaReeYRgBD0q4eAOCIwdi_f6wYXYCORIWSJ68nAA80N7x-mqTSgvr-0Dphs3NmmlLPVNcn2_xF3EsnoVvkLJhv3VtOgx3MsG4Dgny9K6HG6ajT1_bU0MQEJKOH5vPEsKb4wplzVfkXbOHZTpvvq0dFZGnKP-b1rz9IjMZw3l2GmEwp2meZSjQsl86-ru1jGSvVNcwX1VPZkkrE-d2U', // Delivery 2000
  'gid://shopify/Product/8109861306443': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWFc0Y_TrmHEdPxo9vmZKrJYmoHzT7z3PFgsjEMpwhTyGdRqn-E4M3CEAnBHXSyAnxOjjeCSiy6pWTOxjpkqxGw0tGe9CU1Al7c838KQyQUXGXBBN0UCwEN1v4KG_Jtoss6QjqB7HgDlSqENOVvnd0OEzlr28yxY6LQoRmmkOxLoUE55p1oHzjWPQoUeMe59Y5P-7s7rIKKrdSGTU630DueIG4sHUSu-VPP5PchrDwGy7YzaDtSh9gCm4HLpXAli85-O2b5MGYJN8', // Sport 3000
};

for (const [id, src] of Object.entries(products)) {
  console.log('product media', id);
  const data = await gql(
    `mutation($productId: ID!, $media: [CreateMediaInput!]!) { productCreateMedia(productId: $productId, media: $media) { media { id } mediaUserErrors { field message } } }`,
    { productId: id, media: [{ originalSource: src, mediaContentType: 'IMAGE' }] }
  );
  if (data.productCreateMedia.mediaUserErrors?.length) console.log('  !', JSON.stringify(data.productCreateMedia.mediaUserErrors));
  await sleep(400);
}
console.log('\nListo.');
