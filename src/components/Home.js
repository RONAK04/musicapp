import { Button, Container, Grid, Input, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { DataGrid } from '@mui/x-data-grid';
import "../App.css";
// import "./home.css";
import SearchIcon from '@mui/icons-material/Search';
import { Search } from "@mui/icons-material";
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function Home() {
    const [audioBlobArray, setAudioBlobArray] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => { console.log("current", currentTrack) }, [currentTrack])
    const handleFileChange = async (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            try {
                const db = await openDatabase();
                const newBlobs = await Promise.all(
                    Array.from(files).map(async (file, index) => {
                        const audioBlob = await readFileAsBlob(file);
                        const id = audioBlobArray.length + index;
                        return { blob: audioBlob, name: file.name, id };
                    })
                );

                const currentBlobs = await getBlobFromObjectStore(db, 'audioFiles', 'userAudio');
                const combinedBlobs = currentBlobs.concat(newBlobs);

                await putBlobInObjectStore(db, 'audioFiles', 'userAudio', combinedBlobs);

                setAudioBlobArray(combinedBlobs);
                setIsPlaying(currentTrack === 0);
            } catch (error) {
                console.error('Error accessing IndexedDB:', error);
            }
        }
    };

    useEffect(() => {
        const getAudioBlobArray = async () => {
            try {
                const db = await openDatabase();
                const audioBlobArray = await getBlobFromObjectStore(db, 'audioFiles', 'userAudio');

                if (audioBlobArray) {
                    setAudioBlobArray(audioBlobArray);

                    // Get the last played track from IndexedDB
                    const lastPlayedTrackInfo = await getLastPlayedTrack(db);
                    if (lastPlayedTrackInfo) {
                        const { index, totalTracks } = lastPlayedTrackInfo;
                        setCurrentTrack(index);
                    }
                }
            } catch (error) {
                console.error('Error accessing IndexedDB:', error);
            }
        };

        getAudioBlobArray();
    }, []);

    const openDatabase = () => {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('AudioDatabase', 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                db.createObjectStore('audioFiles');
                db.createObjectStore('lastPlayedTrack');
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const readFileAsBlob = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const audioBlob = new Blob([reader.result], { type: file.type });
                resolve(audioBlob);
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const putBlobInObjectStore = (db, storeName, key, blob) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.put(blob, key);

            transaction.oncomplete = () => {
                resolve("resolved");
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const getBlobFromObjectStore = (db, storeName, key) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.get(key);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const getLastPlayedTrack = (db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['lastPlayedTrack'], 'readonly');
            const objectStore = transaction.objectStore('lastPlayedTrack');
            const request = objectStore.get('lastPlayed');

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const saveLastPlayedTrack = (db, index) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['lastPlayedTrack'], 'readwrite');
            const objectStore = transaction.objectStore('lastPlayedTrack');
            const request = objectStore.put({ index }, 'lastPlayed');

            transaction.oncomplete = () => {
                resolve("resolved");
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const handleTrackChange = (index) => {
        setCurrentTrack(index);
        setIsPlaying(!isPlaying);

        // Save the last played track to IndexedDB
        openDatabase()
            .then((db) => saveLastPlayedTrack(db, index))
            .catch((error) => console.error('Error saving last played track:', error));
    };

    const handleClearPlaylist = async () => {
        try {
            const db = await openDatabase();
            // Clear data from both object stores
            await clearObjectStore(db, 'audioFiles');
            await clearObjectStore(db, 'lastPlayedTrack');

            // Reset state
            setAudioBlobArray([]);
            setCurrentTrack(0);
            setIsPlaying(false);
        } catch (error) {
            console.error('Error clearing playlist:', error);
        }
    };

    const clearObjectStore = (db, storeName) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.clear();

            transaction.oncomplete = () => {
                resolve('resolved');
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };



    const columns = [
        { field: 'id', headerName: 'ID', flex: 1 },
        { field: 'name', headerName: 'Song Name', flex: 1 },
        {
            field: 'action',
            headerName: 'Action',
            sortable: false,
            renderCell: (params) => {
                return (
                    <button onClick={() => handleTrackChange(params.row.id)}>
                        {isPlaying && currentTrack === params.row.id ? (
                            <PauseCircleIcon />
                        ) : (
                            <PlayCircleIcon />
                        )}
                    </button>
                );
            },
            width: 130,
        },
    ];


    return (
        <>
            <Container className="maincon">
                <Grid container className="flex items-center py-2.5" >
                    <Grid item xs={4} className="flex">
                        <Button className="w-[58%] !bg-[brown]"
                            component="label"
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                        >Upload Your Songs
                            <input type="file" accept="audio/*" onChange={handleFileChange} multiple style={{ display: 'none' }} />
                        </Button>
                    </Grid>
                    <Grid item xs={4} className="flex justify-center">
                        <Typography className="!text-2xl !font-semibold">Your Playlist</Typography>
                    </Grid>
                    <Grid item xs={4} className="flex justify-end">
                        <Button className="w-[55%] !bg-brown !bg-[brown]"
                            onClick={handleClearPlaylist}
                            variant="contained"
                        >
                            Clear Playlist
                        </Button>
                    </Grid>
                </Grid>


                <div>
                    <div style={{ height: 400, width: '100%' }}>
                        <DataGrid
                            sx={{ color: "white" }}
                            rows={audioBlobArray}
                            columns={columns}
                            pageSize={5}
                            autoPageSize
                            getRowClassName={(params) => {
                                console.log("params", params.row.id, currentTrack);
                                return params.row.id === currentTrack ? 'highlighted' : ''
                            }}
                            components={{
                                NoRowsOverlay: () => <p className="flex justify-center items-center h-full text-base font-semibold">No songs</p>
                            }}
                        />
                    </div>
                    <div className="!w-full relative top-[100px] flex justify-center">
                        {audioBlobArray.length >= 0 && audioBlobArray[currentTrack] && (
                            <audio className="w-[50%]" controls src={window.URL.createObjectURL(audioBlobArray[currentTrack].blob)}
                                onEnded={() => {
                                    // Logic to play the next track when the current one ends
                                    const nextTrack = (currentTrack + 1) % audioBlobArray.length;
                                    setCurrentTrack(nextTrack);
                                    setIsPlaying(true);
                                    openDatabase()
                                        .then((db) => saveLastPlayedTrack(db, nextTrack))
                                        .catch((error) =>
                                            console.error('Error saving last played track:', error)
                                        );
                                }}
                                autoPlay={isPlaying} />
                        )}
                    </div>
                </div>
            </Container>
        </>
    );
}
