'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './UserCollections.module.css';

export default function UserCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserCollections = async () => {
      if (typeof window === 'undefined' || !window.userFid) {
        // Fall back to demo mode if FID is not available
        setLoading(false);
        setError('Please login with Farcaster to view your collections.');
        return;
      }

      try {
        const response = await fetch(`/api/collections/user?fid=${window.userFid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch collections');
        }
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching collections');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCollections();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  if (loading) {
    return <div className={styles.loadingContainer}>Loading your collections...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <Link href="/" className={styles.createButton}>
          Go to Home Page
        </Link>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p>You haven't created any collections yet.</p>
        <Link href="/" className={styles.createButton}>
          Create your first collection
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Collections</h1>
      <div className={styles.grid}>
        {collections.map((collection) => (
          <Link 
            href={`/mint/${collection.hash}`} 
            key={collection.id} 
            className={styles.card}
          >
            <div className={styles.imageContainer}>
              <img 
                src={collection.image_url} 
                alt={collection.collection_name}
                className={styles.image}
              />
            </div>
            <div className={styles.cardContent}>
              <h2 className={styles.collectionName}>{collection.collection_name}</h2>
              <p className={styles.date}>Created on {formatDate(collection.created_at)}</p>
              <div className={styles.viewButton}>View Mint Page</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}