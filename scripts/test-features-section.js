const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const SITECONFIG_API_URL = 'http://localhost:5000/siteconfig-api';

// Test data for Features Section
const testFeaturesData = {
  title: 'Why Choose TechCart',
  subtitle: 'Premium services to make your shopping seamless',
  enabled: true,
  features: [
    {
      icon: '🚚',
      title: 'Fast & Free Shipping',
      description: 'Get your orders delivered swiftly with free shipping on select items.',
      image: 'IMAGE_11.png'
    },
    {
      icon: '🎧',
      title: '24/7 Customer Support',
      description: 'We are here to help you anytime, anywhere.',
      image: 'IMAGE_11.png'
    },
    {
      icon: '🔄',
      title: 'Easy Returns',
      description: 'Hassle-free returns within 30 days of purchase.',
      image: 'IMAGE_11.png'
    },
    {
      icon: '🛡️',
      title: 'Secure Payments',
      description: 'Your transactions are protected with top-grade security.',
      image: 'IMAGE_11.png'
    }
  ]
};

// Test functions
const testGetHomepageConfig = async () => {
  try {
    console.log('🔍 Testing GET /siteconfig/homepage...');
    const response = await axios.get(`${SITECONFIG_API_URL}/siteconfig/homepage`);
    
    if (response.data.success) {
      console.log('✅ Successfully fetched homepage config');
      console.log('📋 Features Section data:', JSON.stringify(response.data.data.featuresSection, null, 2));
      return response.data.data;
    } else {
      console.log('❌ Failed to fetch homepage config:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Error fetching homepage config:', error.message);
    return null;
  }
};

const testUpdateFeaturesSection = async () => {
  try {
    console.log('\n🔄 Testing PUT /siteconfig/homepage with Features Section...');
    
    // First get current config
    const currentConfig = await testGetHomepageConfig();
    if (!currentConfig) {
      console.log('❌ Cannot update - failed to get current config');
      return false;
    }

    // Update with test data
    const updatedConfig = {
      ...currentConfig,
      featuresSection: testFeaturesData
    };

    const response = await axios.put(`${SITECONFIG_API_URL}/siteconfig/homepage`, {
      config: updatedConfig,
      version: 1
    });

    if (response.data.success) {
      console.log('✅ Successfully updated Features Section');
      console.log('📋 Updated data:', JSON.stringify(response.data.data.featuresSection, null, 2));
      return true;
    } else {
      console.log('❌ Failed to update Features Section:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error updating Features Section:', error.message);
    return false;
  }
};

const testValidateConfig = async () => {
  try {
    console.log('\n🔍 Testing POST /siteconfig/validate...');
    
    const testConfig = {
      featuresSection: testFeaturesData
    };

    const response = await axios.post(`${SITECONFIG_API_URL}/siteconfig/validate`, {
      config: testConfig
    });

    if (response.data.success) {
      console.log('✅ Configuration validation passed');
      console.log('📊 Validation result:', {
        isValid: response.data.validation.isValid,
        errors: response.data.validation.errorCount,
        warnings: response.data.validation.warningCount
      });
      return true;
    } else {
      console.log('❌ Configuration validation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error validating configuration:', error.message);
    return false;
  }
};

const testFeaturesSectionDisable = async () => {
  try {
    console.log('\n🔄 Testing Features Section disable functionality...');
    
    // Get current config
    const currentConfig = await testGetHomepageConfig();
    if (!currentConfig) return false;

    // Disable features section
    const disabledConfig = {
      ...currentConfig,
      featuresSection: {
        ...currentConfig.featuresSection,
        enabled: false
      }
    };

    const response = await axios.put(`${SITECONFIG_API_URL}/siteconfig/homepage`, {
      config: disabledConfig,
      version: 1
    });

    if (response.data.success) {
      console.log('✅ Successfully disabled Features Section');
      
      // Re-enable it
      const enabledConfig = {
        ...currentConfig,
        featuresSection: {
          ...currentConfig.featuresSection,
          enabled: true
        }
      };

      const enableResponse = await axios.put(`${SITECONFIG_API_URL}/siteconfig/homepage`, {
        config: enabledConfig,
        version: 1
      });

      if (enableResponse.data.success) {
        console.log('✅ Successfully re-enabled Features Section');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log('❌ Error testing enable/disable:', error.message);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Features Section API Tests...\n');
  
  const results = {
    getConfig: false,
    updateConfig: false,
    validateConfig: false,
    enableDisable: false
  };

  // Test 1: Get homepage config
  results.getConfig = await testGetHomepageConfig();
  
  // Test 2: Update Features Section
  if (results.getConfig) {
    results.updateConfig = await testUpdateFeaturesSection();
  }
  
  // Test 3: Validate configuration
  results.validateConfig = await testValidateConfig();
  
  // Test 4: Enable/Disable functionality
  if (results.updateConfig) {
    results.enableDisable = await testFeaturesSectionDisable();
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`GET homepage config: ${results.getConfig ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`UPDATE Features Section: ${results.updateConfig ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`VALIDATE configuration: ${results.validateConfig ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`ENABLE/DISABLE toggle: ${results.enableDisable ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Features Section API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the backend server and MongoDB connection.');
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testFeaturesData };
