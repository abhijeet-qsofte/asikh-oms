#!/usr/bin/env node

/**
 * Expo Configuration Analyzer
 * This script analyzes your Expo setup and compares it with Expo Go requirements
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ExpoConfigAnalyzer {
  constructor() {
    this.results = {
      projectInfo: {},
      dependencies: {},
      environment: {},
      expoConfig: {},
      compatibilityIssues: [],
      recommendations: [],
    };
  }

  // Helper to run commands safely
  runCommand(command, description) {
    try {
      console.log(`\n🔍 ${description}...`);
      const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      return result.trim();
    } catch (error) {
      console.log(`❌ Error running: ${command}`);
      return `Error: ${error.message}`;
    }
  }

  // Check if we're in an Expo project
  checkProjectType() {
    console.log('\n📱 CHECKING PROJECT TYPE');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const appConfigPath = path.join(process.cwd(), 'app.config.js');

    this.results.projectInfo = {
      hasPackageJson: fs.existsSync(packageJsonPath),
      hasAppJson: fs.existsSync(appJsonPath),
      hasAppConfig: fs.existsSync(appConfigPath),
      isExpoProject: false,
    };

    if (this.results.projectInfo.hasPackageJson) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        this.results.projectInfo.isExpoProject = !!(
          packageJson.dependencies?.expo ||
          packageJson.devDependencies?.expo ||
          packageJson.dependencies?.['@expo/cli']
        );
        this.results.projectInfo.packageJson = packageJson;
      } catch (error) {
        console.log('❌ Error reading package.json');
      }
    }

    console.log(
      `Project Type: ${
        this.results.projectInfo.isExpoProject ? 'Expo' : 'React Native'
      }`
    );
  }

  // Get Expo configuration
  getExpoConfig() {
    console.log('\n⚙️  EXPO CONFIGURATION');

    // Get basic config
    this.results.expoConfig.basic = this.runCommand(
      'npx expo config',
      'Getting Expo config'
    );

    // Get public config (more detailed)
    this.results.expoConfig.detailed = this.runCommand(
      'npx expo config --type public',
      'Getting detailed Expo config'
    );

    // Check Expo CLI version
    this.results.expoConfig.cliVersion = this.runCommand(
      'npx expo --version',
      'Getting Expo CLI version'
    );
  }

  // Check environment setup
  checkEnvironment() {
    console.log('\n🌍 ENVIRONMENT CHECK');

    const envChecks = [
      { command: 'node --version', name: 'Node.js' },
      { command: 'npm --version', name: 'npm' },
      { command: 'java -version', name: 'Java' },
      { command: 'echo $ANDROID_HOME', name: 'ANDROID_HOME' },
      { command: 'echo $JAVA_HOME', name: 'JAVA_HOME' },
      { command: 'adb version', name: 'ADB' },
      { command: 'gradle --version', name: 'Gradle' },
    ];

    envChecks.forEach((check) => {
      this.results.environment[check.name] = this.runCommand(
        check.command,
        `Checking ${check.name}`
      );
    });
  }

  // Check dependencies
  checkDependencies() {
    console.log('\n📦 DEPENDENCIES CHECK');

    // Check Expo SDK version
    this.results.dependencies.expoSdk = this.runCommand(
      'npm list expo',
      'Checking Expo SDK version'
    );

    // Check for compatibility issues
    this.results.dependencies.doctorCheck = this.runCommand(
      'npx expo doctor',
      'Running Expo doctor'
    );

    // Check React Native version
    this.results.dependencies.reactNative = this.runCommand(
      'npm list react-native',
      'Checking React Native version'
    );

    // List all dependencies
    try {
      const packageJson = this.results.projectInfo.packageJson;
      if (packageJson) {
        this.results.dependencies.all = {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
        };
      }
    } catch (error) {
      console.log('❌ Error reading dependencies');
    }
  }

  // Check Expo Go compatibility
  checkExpoGoCompatibility() {
    console.log('\n📱 EXPO GO COMPATIBILITY');

    // Get supported SDK versions for Expo Go
    this.results.compatibilityIssues = [];

    try {
      const packageJson = this.results.projectInfo.packageJson;
      if (packageJson?.dependencies?.expo) {
        const expoVersion = packageJson.dependencies.expo;
        console.log(`Current Expo SDK: ${expoVersion}`);

        // Check if using custom native code
        const hasCustomNative = !!(
          packageJson.dependencies?.['react-native-'] ||
          Object.keys(packageJson.dependencies || {}).some(
            (dep) => dep.includes('react-native-') && !dep.includes('@expo')
          )
        );

        if (hasCustomNative) {
          this.results.compatibilityIssues.push(
            'Custom native dependencies detected - may not work in Expo Go'
          );
        }
      }
    } catch (error) {
      console.log('❌ Error checking compatibility');
    }
  }

  // Generate recommendations
  generateRecommendations() {
    console.log('\n💡 GENERATING RECOMMENDATIONS');

    const recommendations = [];

    // Check Java version
    if (this.results.environment.Java?.includes('Error')) {
      recommendations.push('Install Java JDK (required for Android builds)');
    }

    // Check Android setup
    if (
      this.results.environment.ANDROID_HOME?.includes('Error') ||
      !this.results.environment.ANDROID_HOME
    ) {
      recommendations.push('Set ANDROID_HOME environment variable');
    }

    // Check for Expo Go issues
    if (this.results.compatibilityIssues.length > 0) {
      recommendations.push(
        'Consider using EAS Build for custom native dependencies'
      );
    }

    this.results.recommendations = recommendations;
  }

  // Print summary report
  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPO CONFIGURATION ANALYSIS REPORT');
    console.log('='.repeat(60));

    console.log('\n🏗️  PROJECT INFO:');
    console.log(`- Is Expo Project: ${this.results.projectInfo.isExpoProject}`);
    console.log(`- Has app.json: ${this.results.projectInfo.hasAppJson}`);
    console.log(
      `- Has app.config.js: ${this.results.projectInfo.hasAppConfig}`
    );

    console.log('\n📱 EXPO GO COMPATIBILITY ISSUES:');
    if (this.results.compatibilityIssues.length === 0) {
      console.log('✅ No obvious compatibility issues found');
    } else {
      this.results.compatibilityIssues.forEach((issue) => {
        console.log(`❌ ${issue}`);
      });
    }

    console.log('\n💡 RECOMMENDATIONS:');
    if (this.results.recommendations.length === 0) {
      console.log('✅ Environment looks good!');
    } else {
      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n📄 DETAILED LOGS:');
    console.log(
      'Check the generated expo-analysis-report.json for complete details'
    );
  }

  // Save detailed report to file
  saveReport() {
    const reportPath = path.join(process.cwd(), 'expo-analysis-report.json');
    try {
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.log('❌ Error saving report file');
    }
  }

  // Main analysis function
  async analyze() {
    console.log('🚀 Starting Expo Configuration Analysis...');

    this.checkProjectType();

    if (!this.results.projectInfo.isExpoProject) {
      console.log("\n❌ This doesn't appear to be an Expo project");
      console.log(
        "Make sure you're in the root directory of your Expo project"
      );
      return;
    }

    this.getExpoConfig();
    this.checkEnvironment();
    this.checkDependencies();
    this.checkExpoGoCompatibility();
    this.generateRecommendations();

    this.printReport();
    this.saveReport();

    console.log('\n✨ Analysis complete!');
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new ExpoConfigAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = ExpoConfigAnalyzer;
