// Mock AWB data for list
export const mockAwbList = [
  {
    id: '1',
    awbNumber: 'ID1234567890',
    date: '2024-12-01T10:30:00',
    status: 'new',
    customerName: 'PT. Maju Jaya',
    origin: 'Jakarta',
    destination: 'Surabaya',
    photos: [],
  },
  {
    id: '2',
    awbNumber: 'ID0987654321',
    date: '2024-11-28T14:15:00',
    status: 'processing',
    customerName: 'CV. Sejahtera Abadi',
    origin: 'Bandung',
    destination: 'Medan',
    photos: [],
  },
  {
    id: '3',
    awbNumber: 'ID1122334455',
    date: '2024-11-25T09:45:00',
    status: 'completed',
    customerName: 'UD. Sumber Rejeki',
    origin: 'Yogyakarta',
    destination: 'Denpasar',
    photos: [],
  },
  {
    id: '4',
    awbNumber: 'ID4455667788',
    date: '2024-12-02T16:20:00',
    status: 'new',
    customerName: 'PT. Berkah Sentosa',
    origin: 'Semarang',
    destination: 'Makassar',
    photos: [],
  },
  {
    id: '5',
    awbNumber: 'ID9988776655',
    date: '2024-11-30T11:10:00',
    status: 'processing',
    customerName: 'CV. Cemerlang Jaya',
    origin: 'Palembang',
    destination: 'Balikpapan',
    photos: [],
  },
  {
    id: '6',
    awbNumber: 'ID3344556677',
    date: '2024-12-01T13:40:00',
    status: 'completed',
    customerName: 'UD. Makmur Sejahtera',
    origin: 'Manado',
    destination: 'Jayapura',
    photos: [],
  },
];

export const mockAwbDetail = {
  id: '1',
  awbNumber: 'ID1234567890',
  photoAirwaybill: null, // No initial photo
  xrayPhotos: [], // Array for multiple X-ray photos
};