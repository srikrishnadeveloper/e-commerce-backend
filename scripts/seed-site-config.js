const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SiteConfig = require('../src/models/SiteConfig');

// Load environment variables
dotenv.config({ path: './config.env' });

const siteConfigs = [
  {
    key: 'all',
    config: {
      branding: {
        logo: {
          light: '/logo.svg',
          dark: '/logo-dark.svg',
          alt: 'TechCart Logo',
        },
        faviconUrl: '/favicon.ico',
        colors: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#ef4444',
          neutral: '#f3f4f6',
        },
      },
      navigation: {
        mainMenu: [
          { name: 'Home', link: '/' },
          { name: 'Shop', link: '/shop' },
          { name: 'About', link: '/about' },
          { name: 'Contact', link: '/contact' },
        ],
        footerNav: [
          { text: 'Privacy Policy', href: '/privacy' },
          { text: 'Terms of Service', href: '/terms' },
        ],
      },
      announcementbar: {
        enabled: true,
        text: 'Free shipping on all orders over ₹50!',
        backgroundColor: '#2c3bc5',
        textColor: '#ffffff',
      },
      hero: {
        slides: [
          {
            id: 1,
            heading: 'Find Your Perfect Style',
            subheading: 'New arrivals are here. Discover the latest trends and update your wardrobe with our exclusive collection.',
            button: 'Shop Now',
            buttonLink: '/products',
            image: '/images/herosection/herosection-1.png',
          },
          {
            id: 2,
            heading: 'Step Up Your Shoe Game',
            subheading: 'From casual sneakers to elegant heels, find the perfect pair for any occasion.',
            button: 'Discover More',
            buttonLink: '/products?category=shoes',
            image: '/images/herosection/herosection-2.png',
          },
          {
            id: 3,
            heading: 'Accessorize Your Look',
            subheading: 'Complete your outfit with our stylish collection of accessories.',
            button: 'Browse Accessories',
            buttonLink: '/products?category=accessories',
            image: '/images/herosection/herosection-3.png',
          },
        ],
      },
      homepage: {
        hotDealsSection: {
          title: 'Hot Deals',
          subtitle: 'Check out our latest offers and save big!',
        },
        featuresSection: {
          title: 'Why shop with TechCart',
          subtitle: 'Premium services to make your shopping seamless',
          features: [
            { icon: 'truck', title: 'Fast & Free Shipping', description: 'Get your orders delivered swiftly with free shipping on select items.' },
            { icon: 'headphones', title: '24/7 Customer Support', description: 'We are here to help you anytime, anywhere.' },
            { icon: 'refresh', title: 'Easy Returns', description: 'Hassle-free returns within 30 days of purchase.' },
            { icon: 'shield', title: 'Secure Payments', description: 'Your transactions are protected with top-grade security.' }
          ]
        },
        testimonialSection: {
          title: 'What our customers say',
          navigationLabels: { previous: 'Previous', next: 'Next' },
          testimonials: [
            { name: 'Alex Johnson', role: 'Verified Buyer', rating: 5, text: 'Fantastic quality and fast delivery. Highly recommend!' },
            { name: 'Sara Lee', role: 'Loyal Customer', rating: 5, text: 'Great customer service and amazing deals.' },
            { name: 'Michael Chen', role: 'New Customer', rating: 4, text: 'Smooth shopping experience and easy returns.' }
          ]
        },
        featuredCollections: {
          title: "Featured Collections",
          enabled: true,
          collections: [
            {
              id: 1,
              title: "UV Charger",
              subtitle: "Every piece is made to last beyond the season",
              description: "Explore our curated selection of premium products designed for the discerning customer.",
              image: "/images/featured-collections/chargerimage.png",
              buttonText: "Shop Collection",
              buttonLink: "/products?category=charging",
              gradient: "from-black/60 to-black/20"
            },
            {
              id: 2,
              title: "Nest Heat",
              subtitle: "Every piece is made to last beyond the season",
              description: "Be the first to discover our latest products and trending styles.",
              image: "/images/featured-collections/headphoneorangecolor.png",
              buttonText: "Shop Collection",
              buttonLink: "/products?category=smart-home",
              gradient: "from-black/60 to-black/20"
            }
          ]
        }
      },
      footer: {
        copyright: '© 2024 TechCart. All Rights Reserved.',
        getDirectionText: 'Get Direction',
        getDirectionLink: 'https://www.google.com/maps',
        newsletter: {
          title: 'Join Our Newsletter',
          description: 'Get exclusive deals and updates straight to your inbox.',
          placeholder: 'Enter your email',
          buttonText: 'Subscribe'
        },
        sections: [
          {
            title: 'Company',
            links: [
              { name: 'About Us', link: '/about' },
              { name: 'Careers', link: '/careers' },
              { name: 'Press', link: '/press' }
            ]
          },
          {
            title: 'Support',
            links: [
              { name: 'Contact Us', link: '/contact' },
              { name: 'FAQ', link: '/faq' },
              { name: 'Shipping & Returns', link: '/shipping-returns' }
            ]
          }
        ]
      },
      company: {
        address: {
          street: "123 Main Street",
          city: "Anytown",
          state: "CA",
          zip: "12345"
        },
        contact: {
          email: "contact@example.com",
          phone: "123-456-7890"
        }
      },
      contactUs: {
        pageTitle: 'Contact Us',
        sectionTitle: 'Visit Our Store',
        formTitle: 'Get in Touch',
        formDescription: "If you've got great products your making or looking to work with us then drop us a line.",
        address: '66 Mott St, New York, New York, Zip Code: 10006, AS',
        phone: '(623) 934-2400',
        email: 'EComposer@example.com',
        businessHoursTitle: 'Open Time',
        businessHours: 'Our store has re-opened for shopping,\nexchange Every day 11am to 7pm',
        socialMedia: [
          {
            name: 'Facebook',
            url: 'https://facebook.com',
            icon: 'facebook'
          },
          {
            name: 'Twitter',
            url: 'https://twitter.com',
            icon: 'twitter'
          },
          {
            name: 'Instagram',
            url: 'https://instagram.com',
            icon: 'instagram'
          }
        ]
      }
    }
  }
];

const seedDB = async () => {
  try {
    const db = process.env.DATABASE;
    if (!db) {
      console.error('DATABASE connection string not found in config.env');
      process.exit(1);
    }

    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected...');

    console.log('Clearing existing site configs...');
    await SiteConfig.deleteMany({});
    console.log('Site configs cleared.');

    console.log('Seeding new site configs...');
    await SiteConfig.insertMany(siteConfigs);
    console.log('Site configs seeded successfully.');

  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedDB();
