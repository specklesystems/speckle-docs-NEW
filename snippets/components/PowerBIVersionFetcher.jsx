import React, { useState, useEffect } from 'react';

const PowerBIVersionFetcher = ({ fallbackVersion = '3.3.3' }) => {
  const [version, setVersion] = useState(fallbackVersion);
  const [downloadUrl, setDownloadUrl] = useState(`https://releases.speckle.dev/build-artifacts/powerbi-v3/speckle.powerbi.installer-${fallbackVersion}.zip`);

  const parseXMLResponse = (xmlText) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const contents = xmlDoc.getElementsByTagName('Contents');
      const powerBIEntries = [];

      for (let content of contents) {
        const key = content.getElementsByTagName('Key')[0]?.textContent;
        const lastModified = content.getElementsByTagName('LastModified')[0]?.textContent;

        if (key && key.includes('build-artifacts/powerbi-v3/speckle.powerbi.installer-') && key.endsWith('.zip')) {
          const versionMatch = key.match(/speckle\.powerbi\.installer-(\d+\.\d+\.\d+)\.zip$/);
          if (versionMatch) {
            powerBIEntries.push({
              version: versionMatch[1],
              key: key,
              lastModified: new Date(lastModified)
            });
          }
        }
      }

      if (powerBIEntries.length === 0) {
        throw new Error('No Power BI build artifacts found');
      }

      powerBIEntries.sort((a, b) => b.lastModified - a.lastModified);
      return powerBIEntries[0].version;

    } catch (parseError) {
      console.error('Error parsing XML:', parseError);
      throw parseError;
    }
  };

  const fetchLatestVersion = async () => {
    try {
      const response = await fetch('https://releases.speckle.dev');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const latestVersion = parseXMLResponse(xmlText);

      setVersion(latestVersion);

    } catch (fetchError) {
      console.error('Error fetching latest version:', fetchError);
    }
  };

  useEffect(() => {
    fetchLatestVersion();
  }, [fallbackVersion]);

  useEffect(() => {
    if (version) {
      const url = `https://releases.speckle.dev/build-artifacts/powerbi-v3/speckle.powerbi.installer-${version}.zip`;
      setDownloadUrl(url);
    }
  }, [version]);

  return (
    <div style={{ textAlign: 'center' }}>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Download Power BI connector
      </a>
    </div>
  );
};

export default PowerBIVersionFetcher;