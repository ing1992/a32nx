import React, { useEffect, useRef, useState } from 'react';
import { BitFlags } from '@shared/bitFlags';
import * as ReactDOMServer from 'react-dom/server';
import { usePersistentProperty } from '@instruments/common/persistence';
import { CanvasConst, RowInfo, SeatConstants, SeatInfo, PaxStationInfo, TYPE } from './Constants';
import { Seat } from '../../../Assets/Seat';
import { SeatOutlineBg } from '../../../Assets/SeatOutlineBg';

interface SeatMapProps {
    seatMap: PaxStationInfo[],
    activeFlags: BitFlags[]
}

export const SeatMap: React.FC<SeatMapProps> = ({ seatMap, activeFlags }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [seatImg, setSeatImg] = useState<HTMLImageElement | null>(null);
    const [seatFilledImg, setSeatFilledImg] = useState<HTMLImageElement | null>(null);
    const [theme] = usePersistentProperty('EFB_UI_THEME', 'blue');

    const getTheme = (theme) => {
        let base = '#fff';
        let primary = '#00C9E4';
        let secondary = '#84CC16';
        switch (theme) {
        case 'dark':
            base = '#fff';
            primary = '#3B82F6';
            secondary = '#84CC16';
            break;
        case 'light':
            base = '#000000';
            primary = '#3B82F6';
            secondary = '#84CC16';
            break;
        default:
            break;
        }
        return [base, primary, secondary];
    };

    const addXOffset = (xOff: number, sec: number, row: number) => {
        let seatType = TYPE.ECO;
        xOff += seatMap[sec].rows[row].xOffset;
        for (let seat = 0; seat < seatMap[sec].rows[row].seats.length; seat++) {
            if (seatType < seatMap[sec].rows[row].seats[seat].type) {
                seatType = seatMap[sec].rows[row].seats[seat].type;
            }
        }
        if (row !== 0 || sec !== 0) {
            xOff += (SeatConstants[seatType].padX + SeatConstants[seatType].len);
        }
        return xOff;
    };

    const addYOffset = (yOff: number, sec: number, row: number, seat: number) => {
        yOff += seatMap[sec].rows[row].yOffset;
        yOff += seatMap[sec].rows[row].seats[seat].yOffset;
        const seatType = seatMap[sec].rows[row].seats[seat].type;
        if (seat !== 0) {
            yOff += (SeatConstants[seatType].padY + SeatConstants[seatType].wid);
        }
        return yOff;
    };

    const draw = () => {
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.beginPath();

            let xOff = 0;
            for (let sec = 0; sec < seatMap.length; sec++) {
                let seatId = 0;
                for (let row = 0; row < seatMap[sec].rows.length; row++) {
                    xOff = addXOffset(xOff, sec, row);
                    drawRow(xOff, sec, row, seatMap[sec].rows[row], seatId);
                    seatId += seatMap[sec].rows[row].seats.length;
                }
            }
            ctx.fill();
        }
    };

    const drawRow = (x: number, sec:number, rowI: number, rowInfo: RowInfo, seatId: number) => {
        const seatsInfo: SeatInfo[] = rowInfo.seats;
        for (let seat = 0, yOff = 0; seat < seatsInfo.length; seat++) {
            yOff = addYOffset(yOff, sec, rowI, seat);
            drawSeat(x, yOff, SeatConstants[seatsInfo[seat].type].imageX, SeatConstants[seatsInfo[seat].type].imageY, sec, seatId++);
        }
    };

    const drawSeat = (x: number, y: number, imageX: number, imageY: number, station: number, seatId: number) => {
        if (ctx && seatImg && seatFilledImg) {
            if (activeFlags[station].getBitIndex(seatId)) {
                ctx.drawImage(seatFilledImg, x, y, imageX, imageY);
            } else {
                ctx.drawImage(seatImg, x, y, imageX, imageY);
            }
        }
    };

    useEffect(() => {
        const [base, primary] = getTheme(theme);

        const img = <Seat fill="none" stroke={base} />;
        const imgElement = new Image();
        imgElement.src = `data:image/svg+xml; charset=utf8, ${encodeURIComponent(ReactDOMServer.renderToStaticMarkup(img))}`;
        setSeatImg(imgElement);

        const imgFilled = <Seat fill={primary} stroke="none" />;
        const imgFilledElement = new Image();
        imgFilledElement.src = `data:image/svg+xml; charset=utf8, ${encodeURIComponent(ReactDOMServer.renderToStaticMarkup(imgFilled))}`;
        setSeatFilledImg(imgFilledElement);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        let frameId;
        if (canvas) {
            const width = CanvasConst.width;
            const height = CanvasConst.height;
            const { devicePixelRatio: ratio = 1 } = window;
            setCtx(canvas.getContext('2d'));
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            ctx?.scale(ratio, ratio);
            const render = () => {
                draw();
                // workaround for bug
                if (!frameId || frameId < 10) {
                    frameId = window.requestAnimationFrame(render);
                }
            };
            render();
            return () => {
                if (frameId) {
                    window.cancelAnimationFrame(frameId);
                }
            };
        }
        return () => {
        };
    }, [draw]);

    return (
        <div className="flex relative flex-col">
            <SeatOutlineBg stroke={getTheme(theme)[0]} highlight="#69BD45" />
            <canvas className="absolute" ref={canvasRef} style={{ transform: `translateX(${CanvasConst.xTransform}) translateY(${CanvasConst.yTransform})` }} />
        </div>
    );
};
