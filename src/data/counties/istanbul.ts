import { CountyData } from '../../CountyMapPopup';

/**
 * Sample county data for Istanbul
 * 
 * NOTE: The SVG path data in this file uses placeholder rectangles for demonstration purposes.
 * These are NOT actual geographic boundaries of Istanbul's counties.
 * 
 * For production use, you should:
 * 1. Replace these paths with actual geographic SVG data
 * 2. Use real county boundary coordinates
 * 3. Consider using a geographic data source like GADM or OpenStreetMap
 * 
 * The current rectangular paths are provided as examples to show the data structure
 * and to allow testing of the county map functionality.
 */
export const istanbulCounties: CountyData = {
  cityId: "istanbul",
  cityName: "İstanbul",
  counties: [
    {
      id: "adalar",
      name: "Adalar",
      path: "M 850,450 L 900,450 L 900,500 L 850,500 Z"
    },
    {
      id: "arnavutkoy",
      name: "Arnavutköy",
      path: "M 200,150 L 280,150 L 280,220 L 200,220 Z"
    },
    {
      id: "atasehir",
      name: "Ataşehir",
      path: "M 650,400 L 720,400 L 720,460 L 650,460 Z"
    },
    {
      id: "avcilar",
      name: "Avcılar",
      path: "M 350,450 L 420,450 L 420,520 L 350,520 Z"
    },
    {
      id: "bagcilar",
      name: "Bağcılar",
      path: "M 420,400 L 490,400 L 490,460 L 420,460 Z"
    },
    {
      id: "bahcelievler",
      name: "Bahçelievler",
      path: "M 450,450 L 520,450 L 520,520 L 450,520 Z"
    },
    {
      id: "bakirkoy",
      name: "Bakırköy",
      path: "M 400,500 L 470,500 L 470,570 L 400,570 Z"
    },
    {
      id: "basaksehir",
      name: "Başakşehir",
      path: "M 350,350 L 430,350 L 430,420 L 350,420 Z"
    },
    {
      id: "bayrampasa",
      name: "Bayrampaşa",
      path: "M 470,400 L 530,400 L 530,450 L 470,450 Z"
    },
    {
      id: "besiktas",
      name: "Beşiktaş",
      path: "M 520,300 L 580,300 L 580,360 L 520,360 Z"
    },
    {
      id: "beykoz",
      name: "Beykoz",
      path: "M 650,200 L 750,200 L 750,300 L 650,300 Z"
    },
    {
      id: "beylikduzu",
      name: "Beylikdüzü",
      path: "M 280,500 L 360,500 L 360,570 L 280,570 Z"
    },
    {
      id: "beyoglu",
      name: "Beyoğlu",
      path: "M 540,320 L 600,320 L 600,380 L 540,380 Z"
    },
    {
      id: "buyukcekmece",
      name: "Büyükçekmece",
      path: "M 200,450 L 290,450 L 290,540 L 200,540 Z"
    },
    {
      id: "catalca",
      name: "Çatalca",
      path: "M 100,250 L 210,250 L 210,360 L 100,360 Z"
    },
    {
      id: "cekmekoy",
      name: "Çekmeköy",
      path: "M 700,300 L 770,300 L 770,370 L 700,370 Z"
    },
    {
      id: "esenler",
      name: "Esenler",
      path: "M 440,420 L 500,420 L 500,470 L 440,470 Z"
    },
    {
      id: "esenyurt",
      name: "Esenyurt",
      path: "M 300,400 L 380,400 L 380,480 L 300,480 Z"
    },
    {
      id: "eyupsultan",
      name: "Eyüpsultan",
      path: "M 480,280 L 560,280 L 560,350 L 480,350 Z"
    },
    {
      id: "fatih",
      name: "Fatih",
      path: "M 520,360 L 580,360 L 580,420 L 520,420 Z"
    },
    {
      id: "gaziosmanpasa",
      name: "Gaziosmanpaşa",
      path: "M 450,320 L 520,320 L 520,380 L 450,380 Z"
    },
    {
      id: "gungoren",
      name: "Güngören",
      path: "M 430,450 L 480,450 L 480,500 L 430,500 Z"
    },
    {
      id: "kadikoy",
      name: "Kadıköy",
      path: "M 620,420 L 690,420 L 690,490 L 620,490 Z"
    },
    {
      id: "kagithane",
      name: "Kâğıthane",
      path: "M 500,320 L 560,320 L 560,370 L 500,370 Z"
    },
    {
      id: "kartal",
      name: "Kartal",
      path: "M 700,480 L 780,480 L 780,560 L 700,560 Z"
    },
    {
      id: "kucukcekmece",
      name: "Küçükçekmece",
      path: "M 360,450 L 440,450 L 440,530 L 360,530 Z"
    },
    {
      id: "maltepe",
      name: "Maltepe",
      path: "M 680,450 L 750,450 L 750,520 L 680,520 Z"
    },
    {
      id: "pendik",
      name: "Pendik",
      path: "M 750,500 L 830,500 L 830,580 L 750,580 Z"
    },
    {
      id: "sancaktepe",
      name: "Sancaktepe",
      path: "M 730,370 L 800,370 L 800,440 L 730,440 Z"
    },
    {
      id: "sariyer",
      name: "Sarıyer",
      path: "M 500,180 L 600,180 L 600,280 L 500,280 Z"
    },
    {
      id: "silivri",
      name: "Silivri",
      path: "M 100,450 L 210,450 L 210,560 L 100,560 Z"
    },
    {
      id: "sultanbeyli",
      name: "Sultanbeyli",
      path: "M 780,400 L 850,400 L 850,470 L 780,470 Z"
    },
    {
      id: "sultangazi",
      name: "Sultangazi",
      path: "M 420,320 L 490,320 L 490,380 L 420,380 Z"
    },
    {
      id: "sile",
      name: "Şile",
      path: "M 800,150 L 900,150 L 900,250 L 800,250 Z"
    },
    {
      id: "sisli",
      name: "Şişli",
      path: "M 530,330 L 590,330 L 590,390 L 530,390 Z"
    },
    {
      id: "tuzla",
      name: "Tuzla",
      path: "M 800,500 L 880,500 L 880,580 L 800,580 Z"
    },
    {
      id: "umraniye",
      name: "Ümraniye",
      path: "M 680,360 L 750,360 L 750,430 L 680,430 Z"
    },
    {
      id: "uskudar",
      name: "Üsküdar",
      path: "M 600,380 L 670,380 L 670,450 L 600,450 Z"
    },
    {
      id: "zeytinburnu",
      name: "Zeytinburnu",
      path: "M 480,450 L 540,450 L 540,510 L 480,510 Z"
    }
  ]
};
