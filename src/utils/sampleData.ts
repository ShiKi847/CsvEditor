export const SAMPLE_SALES_CSV = `Order ID,Customer Name,Region,Category,Units Sold,Unit Price,Total Revenue,Payment Method,Status,Order Date
SO-1001,Sophia Chen,East Asia,Electronics,3,299.99,899.97,Credit Card,Shipped,2026-03-01
SO-1002,Liam Johnson,North America,Office Supplies,12,14.50,174.00,PayPal,Delivered,2026-03-02
SO-1003,Emma Dubois,Western Europe,Furniture,1,450.00,450.00,Bank Wire,Processing,2026-03-03
SO-1004,Kenji Sato,East Asia,Electronics,2,1199.00,2398.00,Credit Card,Delivered,2026-03-04
SO-1005,Elena Rostova,Eastern Europe,Office Supplies,45,2.80,126.00,Credit Card,Shipped,2026-03-05
SO-1006,Marcus Brody,North America,Industrial,4,89.50,358.00,Direct Debit,Cancelled,2026-03-05
SO-1007,Aria Patel,South Asia,Electronics,8,49.99,399.92,UPI,Delivered,2026-03-06
SO-1008,Lucas Silva,South America,Furniture,2,680.00,1360.00,Credit Card,Processing,2026-03-07
SO-1009,Chloe Lefevre,Western Europe,Office Supplies,10,18.25,182.50,PayPal,Delivered,2026-03-08
SO-1010,Noah Taylor,Oceania,Electronics,1,1499.00,1499.00,Credit Card,Shipped,2026-03-09
SO-1011,Hana Al-Mansoor,Middle East,Furniture,3,320.00,960.00,Bank Wire,Delivered,2026-03-10
SO-1012,Wei Zhang,East Asia,Office Supplies,25,8.90,222.50,Alipay,Delivered,2026-03-11
SO-1013,Oliver Schmidt,Central Europe,Electronics,5,85.00,425.00,Credit Card,Processing,2026-03-12
SO-1014,Mia Garcia,North America,Industrial,15,34.00,510.00,Credit Card,Delivered,2026-03-13
SO-1015,Taro Yamada,East Asia,Furniture,1,890.00,890.00,Credit Card,Shipped,2026-03-14`;

export const SAMPLE_MULTILINE_CSV = `Item ID,Product Name,Description,Internal Notes,Rating,Tags
ITM-01,"Ergonomic Mesh Chair","High-grade breathable mesh backrest.
Adjustable lumbar support.
3D armrests with soft PU padding.","Special shipment batch #4402:
Tested for 150kg weight tolerance.
Contains ""UltraGlide"" silent casters.",4.8,"furniture;ergonomic;office"
ITM-02,"Mechanical Keyboard 75%","Compact 82-key ANSI layout.
Hot-swappable tactile switches.
Custom RGB backlighting per key.","Factory firmware v2.1 pre-flashed.
Includes braided Type-C cable and keycap puller.",4.9,"tech;keyboard;gaming"
ITM-03,"Studio Monitor Speakers","Dual bi-amplified active studio reference monitors.
5-inch Kevlar woofer + 1-inch silk dome tweeter.
Balanced XLR and 1/4-inch TRS inputs.","Caution: Package is heavy (14.2kg).
Handle with care: fragile diaphragms.",4.7,"audio;studio;hardware"
ITM-04,"Wireless Noise Cancelling Headphones","Hybrid Active Noise Cancellation (ANC).
Up to 45 hours battery life with quick charge.
Multipoint Bluetooth 5.4 connection.","Winner of ""Editor's Choice 2025"".
Ear cushions replaced with memory foam.",4.6,"audio;travel;wireless"`;

/**
 * Generate a larger dataset (e.g. 500 rows) for stress-testing virtual scroll
 */
export function generateLargeDataset(count = 500): string[][] {
  const categories = ['Hardware', 'Software', 'Services', 'Logistics', 'Security', 'Cloud'];
  const regions = ['APAC', 'EMEA', 'US-East', 'US-West', 'LATAM'];
  const statuses = ['Pending', 'Completed', 'In Review', 'Approved', 'Rejected'];

  const rows: string[][] = [
    ['Index', 'Ticket Code', 'Client', 'Category', 'Server Region', 'Priority Level', 'Estimated Hours', 'Hourly Rate ($)', 'Total Cost ($)', 'Status', 'Last Updated']
  ];

  for (let i = 1; i <= count; i++) {
    const hours = Math.floor(Math.random() * 80) + 5;
    const rate = [65, 85, 120, 150, 200][Math.floor(Math.random() * 5)];
    const cost = hours * rate;
    rows.push([
      String(i),
      `TCK-${10000 + i}`,
      `Enterprise Client ${String.fromCharCode(65 + (i % 26))}`,
      categories[i % categories.length],
      regions[i % regions.length],
      ['Low', 'Medium', 'High', 'Critical'][i % 4],
      String(hours),
      String(rate),
      String(cost),
      statuses[i % statuses.length],
      `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
    ]);
  }

  return rows;
}
