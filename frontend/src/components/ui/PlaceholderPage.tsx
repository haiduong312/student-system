"use client";
import { Card } from "antd";
import { PageHeader } from "./PageHeader";

export function PlaceholderPage({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <>
            <PageHeader title={title} description={description} />
            <Card>
                Module UI will be implemented in the next development phase.
            </Card>
        </>
    );
}
