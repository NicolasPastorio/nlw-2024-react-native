import { useEffect, useState, useRef } from "react";
import { Alert, View, Modal, StatusBar, ScrollView } from "react-native";
import { router, useLocalSearchParams , Redirect } from "expo-router";
import { useCameraPermissions, CameraView } from "expo-camera"

import { api } from "@/services/api";
import { Button } from "@/components/button";
import { Loading } from "@/components/loading";
import { Cover } from "@/components/market/cover";
import { Cupon } from "@/components/market/cupon";
import { Details, PropsDetails } from "@/components/market/details";

type DataProps = PropsDetails & {
    cover: string 
}

export default function Market(){
    const [data, setData] = useState<DataProps>();
    const [cupon, setCupon] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cuponIsFetching, setCuponIsFetching] = useState(false);
    const [isVisibleCameraModal, setIsVisibleCameraModal] = useState(false);

    const [_, requestPermission] = useCameraPermissions();
    //const [permission, requestPermission] = useCameraPermissions();
    const params = useLocalSearchParams<{ id: string}>();

    const qrLock = useRef(false);
    console.log(params.id)
    async function fetchMarket(){
        try {
            const { data } = await api.get("/markets/" + params.id);
            setData(data);
            setIsLoading(false);
            console.log(data);
        } catch (error) {
            console.log(error);
            Alert.alert("Erro", "Não foi possível carregar os dados.", [
                { text: 'OK', onPress: () => router.back() },
            ]);
        }
    }

    async function handleOpenCamera(){
        try {
            const {granted} = await requestPermission();

            if(!granted){
                Alert.alert("Câmera", "Você precisa habilitar o uso da câmera.")
            }

            qrLock.current = false;
            setIsVisibleCameraModal(true);
        } catch (error) {
            console.log(error)
            Alert.alert("Câmera", "Não foi possível utilizar a camêra.");
        }
    }

    async function getCupon(id: string){
        try {
            setCuponIsFetching(true);
            const { data } = await api.patch("/cupons/" + id);
            Alert.alert("Cupom", data.cupon);
            setCupon(data.cupon);
        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Não foi possível utilizar o cupom");
        } finally{
            setCuponIsFetching(false);
        }
    }

    function handleUseCupon(id: string){
        setIsVisibleCameraModal(false);
        Alert.alert(
            "Cupom", 
            "Não é possível reutilizar um cupom resgatado. Deseja realmente resgatar o cupom?", 
            [
                { style: "cancel", text: "Não"},
                { text: "Sim", onPress: () => getCupon(id)},
            ]
        );
    }

    useEffect(() => {
        fetchMarket()
    }, [params.id, cupon])

    if(isLoading){
        return <Loading />
    }

    if(!data){
        return <Redirect href="./home" />
    }
    return <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" hidden={isVisibleCameraModal} />
        
        <ScrollView showsVerticalScrollIndicator={false}>
            <Cover uri={data.cover} />
            <Details data={data} />
            {cupon && <Cupon code={cupon} />}
        </ScrollView>

        <View style={{ padding: 32 }}>
            <Button onPress={handleOpenCamera}>
                <Button.Title>Ler QR Code</Button.Title>
            </Button>
        </View>

        <Modal style={{ flex: 1 }} visible={isVisibleCameraModal}>
            <CameraView 
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={({ data }) => {
                    if(data ** !qrLock.current){
                        qrLock.current = true;
                        setTimeout(() => handleUseCupon(data), 500)
                    }
                }} 
            />

            <View style={{ position: "absolute", bottom: 32, left: 32, right: 32 }}>
                <Button onPress={() => setIsVisibleCameraModal(false)} isLoading={cuponIsFetching}>
                    <Button.Title>Voltar</Button.Title>
                </Button>
            </View>
        </Modal>
    </View>
}