import React from 'react';
import { Segment, Header } from 'semantic-ui-react';
import './WAF.css';

/**
 * Denemeler sayfası - Basit bir içerik ile
 */
function WAFTests() {
    return (
        <>
            <Segment className="component">
                <Header as='h2'>Sunucu Bilgisi</Header>
                <div style={{ 
                    padding: '2rem',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: 'var(--component-title-color)'
                }}>
                    Server IP: 192.168.1.1
                </div>
            </Segment>
        </>
    );
}

export default WAFTests;
