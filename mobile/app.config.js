const baseConfig = require('./app.json');

module.exports = () => {
  const expo = baseConfig.expo ?? {};

  return {
    ...baseConfig,
    expo: {
      ...expo,
      plugins: [
        ...(expo.plugins ?? []),
        [
          'react-native-fbsdk-next',
          {
            appID: '1790226149014594',
            clientToken: '923fd0b01d3e5bcdb4a76dbc1755b307',
            displayName: 'TrackEats',
            scheme: 'fb1790226149014594',
            advertiserIDCollectionEnabled: false,
            autoLogAppEventsEnabled: false,
            isAutoInitEnabled: false,
          },
        ],
      ],
    },
  };
};